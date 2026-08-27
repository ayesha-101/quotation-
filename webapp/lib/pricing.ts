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
