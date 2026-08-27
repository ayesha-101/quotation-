"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  computeLinePricing,
  round2,
  gpTier,
  DEFAULT_MARGIN_PCT,
  type PricingControls,
} from "@/lib/pricing";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

function canEditQuotes(role: string): boolean {
  return role === "ADMIN" || role === "QUOTATION_OFFICER";
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

    const tier = gpTier(quotation.gp);
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
      data: { quotationId, tier },
    });
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
  if (user.role !== "SALESMAN" || quotation.salesmanId !== user.id) {
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
  const codes = nonEmpty.map((l) => l.code?.trim().toUpperCase()).filter(Boolean);
  const catalogItems = codes.length
    ? await prisma.catalogItem.findMany({ where: { code: { in: codes } } })
    : [];
  const catalogByCode = new Map(catalogItems.map((c) => [c.code.toUpperCase(), c]));

  const computedLines = nonEmpty.map((l) => {
    const cat = l.code ? catalogByCode.get(l.code.trim().toUpperCase()) : undefined;
    const qty = Number.isFinite(l.qty) ? l.qty : 0;
    const speDiscPct = Number.isFinite(l.speDiscPct) ? l.speDiscPct : 0;
    const marginPct = Number.isFinite(l.marginPct) ? l.marginPct : DEFAULT_MARGIN_PCT;

    if (cat) {
      const p = computeLinePricing(cat, { speDiscPct, marginPct, ctl });
      return {
        code: cat.code,
        description: cat.description,
        brand: cat.brand,
        uom: cat.uom,
        qty,
        speDiscPct,
        marginPct,
        unitLanded: p.landedUnit,
        unitSell: p.sellUnit,
        lineTotal: round2(qty * p.sellUnit),
        manual: false,
      };
    }
    const unitSell = Number.isFinite(l.unitSell) ? l.unitSell : 0;
    return {
      code: l.code || "",
      description: l.description || "",
      brand: l.brand || "",
      uom: l.uom || "",
      qty,
      speDiscPct,
      marginPct,
      unitLanded: 0,
      unitSell,
      lineTotal: round2(qty * unitSell),
      manual: true,
    };
  });

  const quoteValue = round2(computedLines.reduce((s, l) => s + l.lineTotal, 0));
  const vat = round2(quoteValue * 0.05);
  const totalValue = round2(quoteValue + vat);
  const landedTotal = computedLines.reduce((s, l) => s + l.unitLanded * l.qty, 0);
  const gp = quoteValue ? ((quoteValue - landedTotal) / quoteValue) * 100 : 0;

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

  redirect(`/quotations/${quotationId}`);
}
