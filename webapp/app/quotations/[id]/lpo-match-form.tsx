"use client";

import { useState, useTransition } from "react";
import { convertToLpoAction, type MismatchInfo } from "../actions";

interface LineData {
  id: string;
  code: string;
  description: string;
  qty: number;
  unitSell: number;
}

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LpoMatchForm({
  quotationId,
  lines,
}: {
  quotationId: string;
  lines: LineData[];
}) {
  const [open, setOpen] = useState(false);
  const [lpoNo, setLpoNo] = useState("");
  const [rows, setRows] = useState(
    lines.map((l) => ({ lineId: l.id, custQty: l.qty, custPrice: l.unitSell }))
  );
  const [mismatches, setMismatches] = useState<MismatchInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setRow(idx: number, patch: Partial<{ custQty: number; custPrice: number }>) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function handleCheck() {
    setError(null);
    const fd = new FormData();
    fd.set("customerLpoNo", lpoNo);
    fd.set("matches", JSON.stringify(rows));
    startTransition(async () => {
      const res = await convertToLpoAction(quotationId, fd);
      if (res.error) setError(res.error);
      else if (res.mismatches) setMismatches(res.mismatches);
      else {
        setMismatches(null);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button className="btn primary" onClick={() => setOpen(true)}>
        Convert to LPO
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 14, marginBottom: 6 }}>Match customer LPO</h2>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14, lineHeight: 1.5 }}>
        Attach the customer&apos;s LPO and match it against our quotation before converting. If
        any quantity or price doesn&apos;t match, conversion is blocked until it&apos;s resolved.
      </p>

      {error && <div className="error-note">{error}</div>}
      {mismatches && mismatches.length > 0 && (
        <div className="error-note">
          <b>
            {mismatches.length} mismatch{mismatches.length > 1 ? "es" : ""} found — this LPO does
            not match our quotation:
          </b>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {mismatches.map((m, i) => (
              <li key={i}>
                {m.label}: {m.detail}
              </li>
            ))}
          </ul>
          Correct the fields below to match what the customer&apos;s LPO actually states, then
          re-check.
        </div>
      )}

      <div className="field">
        <label>Customer LPO number</label>
        <input value={lpoNo} onChange={(e) => setLpoNo(e.target.value)} placeholder="Customer's PO reference" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Our Qty</th>
              <th>Customer LPO Qty</th>
              <th>Our Price</th>
              <th>Customer LPO Price</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const mism = mismatches?.some((m) => m.label === (l.description || l.code));
              return (
                <tr key={l.id} style={mism ? { background: "var(--red-bg)" } : undefined}>
                  <td>{l.description || l.code}</td>
                  <td className="mono">{l.qty}</td>
                  <td>
                    <input
                      className="mono"
                      style={{ width: 90 }}
                      type="number"
                      value={rows[idx].custQty}
                      onChange={(e) => setRow(idx, { custQty: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="mono">{fmtMoney(l.unitSell)}</td>
                  <td>
                    <input
                      className="mono"
                      style={{ width: 100 }}
                      type="number"
                      step="0.01"
                      value={rows[idx].custPrice}
                      onChange={(e) => setRow(idx, { custPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn primary" disabled={pending} onClick={handleCheck}>
          {pending ? "Checking…" : "Check match & convert"}
        </button>
        <button className="btn" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
