// Pricing engine ported from the original Artifact (src/app-template.html).
// Mirrors the company's Excel costing sheet exactly:
// Std Disc Price -> Spe Disc Price -> Landed Dubai (AED) -> Selling Price (AED)

export const DEFAULT_MARGIN_PCT = 35;

export interface PricingControls {
  speDiscGlobalPct: number;
  exGbp: number;
  freightGlobalPct: number;
  dutyGlobalPct: number;
  marginGlobalPct: number;
}

export interface CatalogPricingInput {
  listPrice: number;
  disPct: number;
  exRate: number;
  freightPct: number;
  dutyPct: number;
  adPct: number;
}

export function defaultPricingControls(): PricingControls {
  return { speDiscGlobalPct: 0, exGbp: 1, freightGlobalPct: 0, dutyGlobalPct: 0, marginGlobalPct: 0 };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function afterDiscount(cat: CatalogPricingInput): number {
  return cat.listPrice * (1 - (cat.disPct || 0) / 100);
}

export function computeLinePricing(
  cat: CatalogPricingInput,
  opts: { speDiscPct?: number; marginPct?: number | null; ctl?: PricingControls }
): { std: number; spe: number; landedUnit: number; sellUnit: number } {
  const ctl = opts.ctl || defaultPricingControls();
  const speDiscPct = opts.speDiscPct || 0;
  const marginPct =
    opts.marginPct === undefined || opts.marginPct === null ? DEFAULT_MARGIN_PCT : opts.marginPct;
  const std = afterDiscount(cat);
  const spe = round2(std * (1 - speDiscPct / 100) * (1 - ctl.speDiscGlobalPct / 100));
  const landedUnit = round2(
    spe *
      (cat.exRate || 1) *
      (ctl.exGbp || 1) *
      (1 + (cat.freightPct || 0) / 100) *
      (1 + ctl.freightGlobalPct / 100) *
      (1 + ctl.dutyGlobalPct / 100) *
      (1 + (cat.dutyPct || 0) / 100) *
      (1 + (cat.adPct || 0) / 100)
  );
  const denom = (1 - marginPct / 100) * (1 - ctl.marginGlobalPct / 100);
  const sellUnit = denom > 0 ? round2(landedUnit / denom) : landedUnit;
  return { std, spe, landedUnit, sellUnit };
}

export interface RawLineInput {
  code?: string;
  description?: string;
  brand?: string;
  uom?: string;
  qty?: number;
  speDiscPct?: number;
  marginPct?: number;
  unitSell?: number;
}

export interface ComputedLine {
  code: string;
  description: string;
  brand: string;
  uom: string;
  qty: number;
  speDiscPct: number;
  marginPct: number;
  unitLanded: number;
  unitSell: number;
  lineTotal: number;
  manual: boolean;
}

export interface ComputedTotals {
  quoteValue: number;
  vat: number;
  totalValue: number;
  gp: number;
}

// Server-side authoritative recomputation, shared by quotation creation
// and revision: given raw line inputs, the real catalog (keyed by
// uppercased code), and the global pricing controls, resolve each line
// against the catalog (or keep it manual if the code doesn't match) and
// total everything up. Never trust client-computed pricing directly.
export function computeQuotationLines(
  rawLines: RawLineInput[],
  catalogByCode: Map<string, CatalogPricingInput>,
  ctl: PricingControls
): { lines: ComputedLine[]; totals: ComputedTotals } {
  const lines: ComputedLine[] = rawLines.map((l) => {
    const cat = l.code ? catalogByCode.get(l.code.trim().toUpperCase()) : undefined;
    const qty = Number.isFinite(l.qty) ? (l.qty as number) : 0;
    const speDiscPct = Number.isFinite(l.speDiscPct) ? (l.speDiscPct as number) : 0;
    const marginPct = Number.isFinite(l.marginPct) ? (l.marginPct as number) : DEFAULT_MARGIN_PCT;

    if (cat) {
      const p = computeLinePricing(cat, { speDiscPct, marginPct, ctl });
      return {
        code: l.code!.trim(),
        description: l.description || "",
        brand: l.brand || "",
        uom: l.uom || "",
        qty,
        speDiscPct,
        marginPct,
        unitLanded: p.landedUnit,
        unitSell: p.sellUnit,
        lineTotal: round2(qty * p.sellUnit),
        manual: false,
      };
    }
    const unitSell = Number.isFinite(l.unitSell) ? (l.unitSell as number) : 0;
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

  const quoteValue = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const vat = round2(quoteValue * 0.05);
  const totalValue = round2(quoteValue + vat);
  const landedTotal = lines.reduce((s, l) => s + l.unitLanded * l.qty, 0);
  const gp = quoteValue ? ((quoteValue - landedTotal) / quoteValue) * 100 : 0;

  return { lines, totals: { quoteValue, vat, totalValue, gp } };
}
