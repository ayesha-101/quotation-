"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  computeQuotationLines,
  defaultPricingControls,
  type PricingControls,
  type RawLineInput,
} from "@/lib/pricing";
import { canEditQuotes, resolveApproverRoleId } from "@/lib/permissions";
import { appendChainEvent } from "@/lib/security-chain";
import type { CatalogItem } from "@prisma/client";

async function lookupCatalogByCode(codes: (string | undefined)[]): Promise<Map<string, CatalogItem>> {
  const cleaned = codes.map((c) => c?.trim().toUpperCase()).filter((c): c is string => !!c);
  if (cleaned.length === 0) return new Map();
  const items = await prisma.catalogItem.findMany({ where: { code: { in: cleaned } } });
  return new Map(items.map((c) => [c.code.toUpperCase(), c]));
}

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export interface MismatchInfo {
  label: string;
  detail: string;
}

export interface ConvertToLpoResult extends ActionResult {
  mismatches?: MismatchInfo[];
}

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function convertToLpoAction(
  quotationId: string,
  formData: FormData
): Promise<ConvertToLpoResult> {
  const user = await requireUser();
  if (!canEditQuotes(user.role)) {
    return { error: "Only the Admin or a Quotation Officer can convert a quotation to an LPO." };
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!quotation) return { error: "Quotation not found." };
  if (quotation.status === "CONVERTED_TO_LPO" || quotation.status === "LOST") {
    return { error: "This quotation can't be converted from its current status." };
  }

  const customerLpoNo = String(formData.get("customerLpoNo") || "").trim();
  let matches: Array<{ lineId: string; custQty: number; custPrice: number }>;
  try {
    matches = JSON.parse(String(formData.get("matches") || "[]"));
  } catch {
    return { error: "Malformed match data." };
  }
  const matchByLineId = new Map(matches.map((m) => [m.lineId, m]));

  const mismatches: MismatchInfo[] = [];
  for (const line of quotation.lines) {
    const m = matchByLineId.get(line.id);
    const custQty = m ? Number(m.custQty) : line.qty;
    const custPrice = m ? Number(m.custPrice) : line.unitSell;
    const label = line.description || line.code || "line item";
    if (custQty !== line.qty) {
      mismatches.push({
        label,
        detail: `Qty — quoted ${line.qty.toLocaleString()}, customer LPO shows ${custQty.toLocaleString()}`,
      });
    }
    if (Math.abs(custPrice - line.unitSell) > 0.01) {
      mismatches.push({
        label,
        detail: `Unit price — quoted ${fmtMoney(line.unitSell)}, customer LPO shows ${fmtMoney(custPrice)}`,
      });
    }
  }

  // Resolved before the transaction: if no role's GP range covers this
  // margin, fail loudly instead of silently creating an unroutable
  // approval — an Admin needs to fix the role coverage gap first.
  let approverRoleId: string | null = null;
  if (mismatches.length === 0) {
    approverRoleId = await resolveApproverRoleId(quotation.gp);
    if (!approverRoleId) {
      return {
        error: `No role is configured to approve ${quotation.gp.toFixed(1)}% GP — ask an Admin to check the GP ranges under Manage roles.`,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      quotation.lines.map((line) => {
        const m = matchByLineId.get(line.id);
        if (!m) return Promise.resolve();
        return tx.quotationLine.update({
          where: { id: line.id },
          data: { custQty: Number(m.custQty), custPrice: Number(m.custPrice) },
        });
      })
    );

    if (mismatches.length > 0) {
      await tx.quotation.update({
        where: { id: quotationId },
        data: { customerLpoNo, lpoMismatch: true },
      });
      await tx.quotationAuditEntry.create({
        data: {
          quotationId,
          who: user.name,
          action:
            `LPO match check failed (customer ref ${customerLpoNo || "—"}): ` +
            mismatches.map((m) => `${m.label} — ${m.detail}`).join("; "),
        },
      });
      return;
    }

    await tx.quotation.update({
      where: { id: quotationId },
      data: { customerLpoNo, lpoMismatch: false, status: "CONVERTED_TO_LPO" },
    });
    await tx.quotationAuditEntry.create({
      data: {
        quotationId,
        who: user.name,
        action: `Converted to LPO — matched against customer LPO ${customerLpoNo || "(no reference given)"}`,
      },
    });
    await tx.approval.create({
      data: { quotationId, roleId: approverRoleId! },
    });
  });

  await appendChainEvent({
    actor: user.name,
    action:
      mismatches.length > 0
        ? `LPO match check failed (customer ref ${customerLpoNo || "—"}): ` +
          mismatches.map((m) => `${m.label} — ${m.detail}`).join("; ")
        : `Converted to LPO — matched against customer LPO ${customerLpoNo || "(no reference given)"}`,
    resource: `quotation:${quotationId}`,
    outcome: mismatches.length > 0 ? "failure" : "success",
  });

  revalidatePath(`/quotations/${quotationId}`);
  if (mismatches.length > 0) return { mismatches };
  return { success: true };
}

export async function flagStatusAction(
  quotationId: string,
  status: "UNDER_NEGOTIATION" | "LOST"
): Promise<ActionResult> {
  const user = await requireUser();

  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) return { error: "Quotation not found." };
  if (!user.role.isSalesman || quotation.salesmanId !== user.id) {
    return { error: "Only the salesman this quotation is assigned to can flag its status." };
  }
  if (quotation.status === "CONVERTED_TO_LPO" || quotation.status === "LOST") {
    return { error: "This quotation can't be flagged from its current status." };
  }

  await prisma.$transaction([
    prisma.quotation.update({ where: { id: quotationId }, data: { status } }),
    prisma.quotationAuditEntry.create({
      data: { quotationId, who: user.name, action: `Flagged as ${status.replace(/_/g, " ")}` },
    }),
  ]);

  await appendChainEvent({
    actor: user.name,
    action: `Flagged as ${status.replace(/_/g, " ")}`,
    resource: `quotation:${quotationId}`,
    outcome: "success",
  });

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { success: true };
}

interface LineInput {
  code: string;
  description: string;
  brand: string;
  uom: string;
  qty: number;
  speDiscPct: number;
  marginPct: number;
  unitSell: number; // used as-is only for manual (non-catalog) lines
}

function currentYYYYMM(): string {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0");
}

export async function createQuotationAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditQuotes(user.role)) {
    return { error: "Only the Admin or a Quotation Officer can create quotations." };
  }

  const salesmanId = String(formData.get("salesmanId") || "");
  const status = String(formData.get("status") || "DRAFT");
  if (!["DRAFT", "QUOTED"].includes(status)) {
    return { error: "Invalid status." };
  }

  const salesman = await prisma.user.findUnique({ where: { id: salesmanId } });
  if (!salesman || !salesman.isActive) {
    return { error: "Choose a valid, active salesman." };
  }

  let lines: LineInput[];
  try {
    lines = JSON.parse(String(formData.get("lines") || "[]"));
  } catch {
    return { error: "Malformed line items." };
  }
  const nonEmpty = lines.filter((l) => l.code || l.description);
  if (nonEmpty.length === 0) {
    return { error: "Add at least one line item." };
  }

  let ctl: PricingControls;
  try {
    ctl = JSON.parse(String(formData.get("pricingControls") || "{}"));
  } catch {
    return { error: "Malformed pricing controls." };
  }

  // Recompute pricing server-side from the real catalog — never trust the
  // client's numbers for anything that feeds GP/approval routing later.
  const catalogByCode = await lookupCatalogByCode(nonEmpty.map((l) => l.code));
  const { lines: computedLines, totals } = computeQuotationLines(nonEmpty, catalogByCode, ctl);
  const { quoteValue, vat, totalValue, gp } = totals;

  const headerFieldNames = [
    "to",
    "attention",
    "reference",
    "project",
    "consultant",
    "client",
    "subject",
    "telNo",
    "faxNo",
    "mobNo",
    "delivery",
    "deliveryPlace",
    "validity",
    "paymentTerms",
    "prepName",
    "prepTitle",
    "prepMobile",
  ] as const;
  const header = Object.fromEntries(
    headerFieldNames.map((f) => [f, String(formData.get(f) || "")])
  );

  let quotationId = "";
  await prisma.$transaction(async (tx) => {
    const seq = await tx.quoteSequence.upsert({
      where: { id: 1 },
      create: { id: 1, value: 1391 },
      update: { value: { increment: 1 } },
    });
    const quoteNo = `BMTC-JIH-${currentYYYYMM()}-${seq.value}`;

    const quotation = await tx.quotation.create({
      data: {
        quoteNo,
        status: status as "DRAFT" | "QUOTED",
        salesmanId,
        createdById: user.id,
        ...header,
        pricingControls: ctl as object,
        quoteValue,
        vat,
        totalValue,
        gp,
        lines: {
          create: computedLines.map((l, position) => ({ ...l, position })),
        },
        auditLog: {
          create: [{ who: user.name, action: `Quotation created (${status})` }],
        },
      },
    });
    quotationId = quotation.id;
  });

  await appendChainEvent({
    actor: user.name,
    action: `Quotation created (${status})`,
    resource: `quotation:${quotationId}`,
    outcome: "success",
  });

  redirect(`/quotations/${quotationId}`);
}

const REVISABLE_STATUSES = ["QUOTED", "UNDER_NEGOTIATION"];

export async function reviseQuotationAction(
  quotationId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditQuotes(user.role)) {
    return { error: "Only the Admin or a Quotation Officer can revise a quotation." };
  }

  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) return { error: "Quotation not found." };
  if (!REVISABLE_STATUSES.includes(quotation.status)) {
    return { error: "Only a Quoted or Under Negotiation quotation can be revised." };
  }

  let rawLines: RawLineInput[];
  try {
    rawLines = JSON.parse(String(formData.get("lines") || "[]"));
  } catch {
    return { error: "Malformed line items." };
  }
  const nonEmpty = rawLines.filter((l) => l.code || l.description);
  if (nonEmpty.length === 0) {
    return { error: "Add at least one line item." };
  }

  // Matches the original Artifact: revising recalculates against default
  // (zeroed) global pricing controls, not whatever the quotation was
  // originally saved with — each revision starts from a clean baseline.
  const catalogByCode = await lookupCatalogByCode(nonEmpty.map((l) => l.code));
  const { lines: computedLines, totals } = computeQuotationLines(
    nonEmpty,
    catalogByCode,
    defaultPricingControls()
  );

  const nextRevision = quotation.revision + 1;

  await prisma.$transaction([
    prisma.revisionSnapshot.create({
      data: {
        quotationId,
        revision: quotation.revision,
        value: quotation.quoteValue,
        at: quotation.lastEditedAt,
      },
    }),
    prisma.quotationLine.deleteMany({ where: { quotationId } }),
    prisma.quotation.update({
      where: { id: quotationId },
      data: {
        revision: nextRevision,
        quoteValue: totals.quoteValue,
        vat: totals.vat,
        totalValue: totals.totalValue,
        gp: totals.gp,
        pricingControls: defaultPricingControls() as object,
        lines: { create: computedLines.map((l, position) => ({ ...l, position })) },
      },
    }),
    prisma.quotationAuditEntry.create({
      data: { quotationId, who: user.name, action: `Revised to R${nextRevision}` },
    }),
  ]);

  await appendChainEvent({
    actor: user.name,
    action: `Revised to R${nextRevision}`,
    resource: `quotation:${quotationId}`,
    outcome: "success",
  });

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { success: true };
}
