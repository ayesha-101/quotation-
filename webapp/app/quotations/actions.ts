"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import {
  computeLinePricing,
  round2,
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
