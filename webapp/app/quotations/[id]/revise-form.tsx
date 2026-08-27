"use client";

import { useMemo, useState, useTransition } from "react";
import { reviseQuotationAction } from "../actions";
import {
  computeLinePricing,
  round2,
  DEFAULT_MARGIN_PCT,
  defaultPricingControls,
} from "@/lib/pricing";

interface CatalogItemData {
  code: string;
  description: string;
  brand: string;
  uom: string;
  listPrice: number;
  disPct: number;
  exRate: number;
  freightPct: number;
  dutyPct: number;
  adPct: number;
}

interface LineState {
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

function findCatalogItem(catalog: CatalogItemData[], code: string) {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  return catalog.find((it) => it.code.toUpperCase() === c);
}

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReviseForm({
  quotationId,
  quoteNo,
  currentRevision,
  currentValue,
  initialLines,
  catalog,
}: {
  quotationId: string;
  quoteNo: string;
  currentRevision: number;
  currentValue: number;
  initialLines: LineState[];
  catalog: CatalogItemData[];
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<LineState[]>(initialLines);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ctl = defaultPricingControls();
  const nextSuffix = `R${currentRevision + 1}`;

  function recalcLine(line: LineState): LineState {
    const cat = findCatalogItem(catalog, line.code);
    if (cat) {
      const p = computeLinePricing(cat, { speDiscPct: line.speDiscPct, marginPct: line.marginPct, ctl });
      const next = {
        ...line,
        description: cat.description,
        brand: cat.brand,
        uom: cat.uom,
        manual: false,
        unitLanded: p.landedUnit,
        unitSell: p.sellUnit,
      };
      next.lineTotal = round2((next.qty || 0) * (next.unitSell || 0));
      return next;
    }
    const next = { ...line, manual: true };
    next.lineTotal = round2((next.qty || 0) * (next.unitSell || 0));
    return next;
  }

  function updateLine(idx: number, patch: Partial<LineState>) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = recalcLine({ ...next[idx], ...patch });
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        code: "",
        description: "",
        brand: "",
        uom: "",
        qty: 1,
        speDiscPct: 0,
        marginPct: DEFAULT_MARGIN_PCT,
        unitLanded: 0,
        unitSell: 0,
        lineTotal: 0,
        manual: true,
      },
    ]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const newValue = useMemo(() => round2(lines.reduce((s, l) => s + l.lineTotal, 0)), [lines]);

  function handleSave() {
    setError(null);
    if (lines.every((l) => !l.code && !l.description)) {
      setError("Add at least one line item.");
      return;
    }
    const fd = new FormData();
    fd.set("lines", JSON.stringify(lines));
    startTransition(async () => {
      const res = await reviseQuotationAction(quotationId, fd);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        Revise
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 className="mono" style={{ fontSize: 15, marginBottom: 4 }}>
        {quoteNo}-{nextSuffix}
      </h2>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14 }}>
        Revising — current value {fmtMoney(currentValue)}
      </p>
      <div className="permission-note">
        Saving will supersede the current version, bump the reference to <b>{nextSuffix}</b>, and log
        this edit under your name.
      </div>

      {error && <div className="error-note">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Spe.Disc%</th>
              <th>Margin%</th>
              <th>Unit sell</th>
              <th>Line total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const cat = findCatalogItem(catalog, l.code);
              return (
                <tr key={idx}>
                  <td>
                    <input
                      className="mono"
                      style={{ minWidth: 110 }}
                      list="catalog-codes"
                      value={l.code}
                      placeholder="Cat. Ref."
                      onChange={(e) => updateLine(idx, { code: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      style={{ minWidth: 160 }}
                      value={l.description}
                      readOnly={!!cat}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="mono"
                      style={{ width: 70 }}
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      className="mono"
                      style={{ width: 70 }}
                      type="number"
                      step="0.01"
                      value={l.speDiscPct}
                      onChange={(e) => updateLine(idx, { speDiscPct: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      className="mono"
                      style={{ width: 70 }}
                      type="number"
                      step="0.01"
                      value={l.marginPct}
                      onChange={(e) => updateLine(idx, { marginPct: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      className="mono"
                      style={{ width: 90 }}
                      type="number"
                      step="0.01"
                      value={l.unitSell}
                      readOnly={!!cat}
                      onChange={(e) => updateLine(idx, { unitSell: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="mono" style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    {fmtMoney(l.lineTotal)}
                  </td>
                  <td>
                    <button type="button" className="remove-line" onClick={() => removeLine(idx)}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <datalist id="catalog-codes">
        {catalog.map((c) => (
          <option key={c.code + c.brand} value={c.code}>
            {c.code} — {c.description} ({c.brand})
          </option>
        ))}
      </datalist>

      <button type="button" className="btn" style={{ marginTop: 10 }} onClick={addLine}>
        + Add item
      </button>

      <div className="totals-box">
        <div className="line total">
          <span>New Quote Value</span>
          <span className="mono">{fmtMoney(newValue)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn primary" disabled={pending} onClick={handleSave}>
          {pending ? "Saving…" : `Save as ${nextSuffix}`}
        </button>
        <button className="btn" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
