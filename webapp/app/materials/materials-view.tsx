"use client";

import { useMemo, useState } from "react";

export interface MaterialLine {
  code: string;
  description: string;
  brand: string;
  qty: number;
}

export interface MaterialQuotation {
  status: string;
  createdAt: string;
  lines: MaterialLine[];
}

function withinPeriod(iso: string, months: number): boolean {
  if (!months) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return new Date(iso) >= cutoff;
}

export default function MaterialsView({ quotations }: { quotations: MaterialQuotation[] }) {
  const [period, setPeriod] = useState(6);

  const rows = useMemo(() => {
    const quoted = new Map<string, { code: string; name: string; brand: string; qty: number }>();
    const converted = new Map<string, number>();

    quotations
      .filter((q) => q.status !== "DRAFT" && withinPeriod(q.createdAt, period))
      .forEach((q) =>
        q.lines.forEach((l) => {
          const key = (l.code || "") + "|" + l.description;
          const entry = quoted.get(key) || { code: l.code, name: l.description, brand: l.brand, qty: 0 };
          entry.qty += l.qty;
          quoted.set(key, entry);
        })
      );

    quotations
      .filter((q) => q.status === "CONVERTED_TO_LPO" && withinPeriod(q.createdAt, period))
      .forEach((q) =>
        q.lines.forEach((l) => {
          const key = (l.code || "") + "|" + l.description;
          converted.set(key, (converted.get(key) || 0) + l.qty);
        })
      );

    return Array.from(quoted.entries())
      .map(([key, info]) => {
        const c = converted.get(key) || 0;
        const gap = info.qty - c;
        const rate = info.qty ? (c / info.qty) * 100 : 0;
        const runRate = period ? Math.round(info.qty / period) : null;
        return { ...info, converted: c, gap, rate, runRate };
      })
      .sort((a, b) => b.gap - a.gap);
  }, [quotations, period]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontSize: 22 }}>Material Tracker</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { label: "3M", v: 3 },
            { label: "6M", v: 6 },
            { label: "All time", v: 0 },
          ].map((p) => (
            <button
              key={p.v}
              className="btn"
              onClick={() => setPeriod(p.v)}
              style={p.v === period ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 20, lineHeight: 1.5 }}>
        Run-rate = average units quoted per month over the selected window — use it as your reorder signal.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Item</th>
              <th>Brand</th>
              <th>Qty quoted</th>
              <th>Qty converted (LPO)</th>
              <th>Gap</th>
              <th>Conversion rate</th>
              <th>Run-rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  No quoted or converted activity for this period.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.code + r.name}>
                  <td className="mono">{r.code || "—"}</td>
                  <td>{r.name}</td>
                  <td>{r.brand || "—"}</td>
                  <td className="mono">{r.qty.toLocaleString()}</td>
                  <td className="mono">{r.converted.toLocaleString()}</td>
                  <td className="mono" style={{ color: r.gap > 0 ? "var(--amber)" : "var(--green)" }}>
                    {r.gap > 0 ? "+" : ""}
                    {r.gap.toLocaleString()}
                  </td>
                  <td className="mono">{r.rate.toFixed(0)}%</td>
                  <td className="mono">{r.runRate !== null ? r.runRate.toLocaleString() + "/mo" : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
