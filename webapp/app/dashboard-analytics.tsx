"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatQuoteRef } from "@/lib/quote-format";

export interface DashboardLine {
  code: string;
  description: string;
  brand: string;
  qty: number;
}

export interface DashboardQuotation {
  id: string;
  quoteNo: string;
  revision: number;
  status: string;
  quoteValue: number;
  gp: number;
  to: string;
  createdAt: string;
  lastEditedAt: string;
  salesmanId: string;
  salesmanName: string;
  createdById: string;
  createdByName: string;
  lines: DashboardLine[];
}

const ACTIVE_STATUSES = ["DRAFT", "QUOTED", "UNDER_NEGOTIATION"];

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function quoteRef(q: DashboardQuotation): string {
  return formatQuoteRef(q);
}

function displayBrand(q: DashboardQuotation): string {
  return Array.from(new Set(q.lines.map((l) => l.brand).filter(Boolean))).join(", ") || "—";
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdue(q: DashboardQuotation): boolean {
  return !["CONVERTED_TO_LPO", "LOST"].includes(q.status) && daysSince(q.lastEditedAt) >= 7;
}

function withinPeriod(iso: string, months: number): boolean {
  if (!months) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return new Date(iso) >= cutoff;
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase());
}

function KpiCard({
  label,
  value,
  sub,
  cls,
  gauge,
}: {
  label: string;
  value: string | number;
  sub?: string;
  cls?: "green" | "amber" | "red";
  gauge?: number;
}) {
  const color = cls === "green" ? "var(--green)" : cls === "amber" ? "var(--amber)" : cls === "red" ? "var(--red)" : "var(--ink)";
  return (
    <div className="card corner-marks">
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ink-faint)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 6 }}>{sub}</div>}
      {gauge !== undefined && (
        <div style={{ height: 5, background: "var(--grid-line)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, gauge))}%`, background: color, borderRadius: 3 }} />
        </div>
      )}
    </div>
  );
}

export default function DashboardAnalytics({
  quotations,
  officers,
  salesmen,
}: {
  quotations: DashboardQuotation[];
  officers: { id: string; name: string }[];
  salesmen: { id: string; name: string }[];
}) {
  const [period, setPeriod] = useState(6);

  const inRange = useMemo(
    () => quotations.filter((q) => withinPeriod(q.createdAt, period)),
    [quotations, period]
  );

  const stats = useMemo(() => {
    const won = inRange.filter((q) => q.status === "CONVERTED_TO_LPO");
    const lost = inRange.filter((q) => q.status === "LOST");
    const decided = won.length + lost.length;
    const winRate = decided ? (won.length / decided) * 100 : 0;
    const quotedValue = inRange.reduce((s, q) => s + q.quoteValue, 0);
    const soldValue = won.reduce((s, q) => s + q.quoteValue, 0);
    const conversion = quotedValue ? (soldValue / quotedValue) * 100 : 0;
    const overdueCount = quotations.filter(isOverdue).length;
    return { won, lost, winRate, quotedValue, soldValue, conversion, overdueCount };
  }, [inRange, quotations]);

  const topMovers = useMemo(() => {
    const qtyMap = new Map<string, { label: string; qty: number }>();
    inRange.forEach((q) =>
      q.lines.forEach((l) => {
        const key = l.code || l.description;
        if (!key) return;
        const label = (l.code ? l.code + " — " : "") + l.description;
        const entry = qtyMap.get(key) || { label, qty: 0 };
        entry.qty += l.qty;
        qtyMap.set(key, entry);
      })
    );
    return Array.from(qtyMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [inRange]);

  const overdueRows = useMemo(
    () => quotations.filter(isOverdue).sort((a, b) => daysSince(b.lastEditedAt) - daysSince(a.lastEditedAt)),
    [quotations]
  );

  const officerRows = useMemo(
    () =>
      officers.map((o) => {
        const owned = quotations.filter((q) => q.createdById === o.id);
        const activeOwned = owned.filter((q) => ACTIVE_STATUSES.includes(q.status));
        return {
          name: o.name,
          activeCount: activeOwned.length,
          value: activeOwned.reduce((s, q) => s + q.quoteValue, 0),
          overdue: activeOwned.filter(isOverdue).length,
          converted: owned.filter((q) => q.status === "CONVERTED_TO_LPO").length,
        };
      }),
    [officers, quotations]
  );

  const salesmanRows = useMemo(
    () =>
      salesmen.map((s) => {
        const owned = quotations.filter((q) => q.salesmanId === s.id);
        const activeOwned = owned.filter((q) => ACTIVE_STATUSES.includes(q.status));
        const won = owned.filter((q) => q.status === "CONVERTED_TO_LPO").length;
        const lost = owned.filter((q) => q.status === "LOST").length;
        const decided = won + lost;
        return {
          name: s.name,
          activeCount: activeOwned.length,
          value: activeOwned.reduce((sum, q) => sum + q.quoteValue, 0),
          winRate: decided ? (won / decided) * 100 : 0,
          lost,
        };
      }),
    [salesmen, quotations]
  );

  const crossBrandRows = useMemo(() => {
    const byCustomer = new Map<string, DashboardQuotation[]>();
    quotations.forEach((q) => {
      const key = q.to || "Unnamed customer";
      const list = byCustomer.get(key) || [];
      list.push(q);
      byCustomer.set(key, list);
    });
    return Array.from(byCustomer.entries())
      .map(([customer, qs]) => {
        const brands = Array.from(new Set(qs.flatMap((q) => q.lines.map((l) => l.brand)).filter(Boolean)));
        return { customer, brands, count: qs.length, value: qs.reduce((s, q) => s + q.quoteValue, 0) };
      })
      .filter((r) => r.brands.length >= 2)
      .sort((a, b) => b.value - a.value);
  }, [quotations]);

  const synergyKpis = useMemo(() => {
    const totalActive = quotations.filter((q) => ACTIVE_STATUSES.includes(q.status)).length;
    const avgPerOfficer = officers.length
      ? officerRows.reduce((s, r) => s + r.activeCount, 0) / officers.length
      : 0;
    const busiest = officerRows.slice().sort((a, b) => b.activeCount - a.activeCount)[0];
    return { totalActive, avgPerOfficer, busiest };
  }, [quotations, officers, officerRows]);

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Dashboard</h2>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard
          label="Win rate"
          value={stats.winRate.toFixed(1) + "%"}
          sub={`${stats.won.length} won / ${stats.lost.length} lost`}
          cls={stats.winRate >= 50 ? "green" : "amber"}
          gauge={stats.winRate}
        />
        <KpiCard label="Quoted value" value={fmtMoney(stats.quotedValue)} sub={`${inRange.length} quotations`} />
        <KpiCard label="Converted value (LPO)" value={fmtMoney(stats.soldValue)} sub={`${stats.won.length} orders`} cls="green" />
        <KpiCard
          label="Quoted → sold conversion"
          value={stats.conversion.toFixed(1) + "%"}
          sub="value-weighted"
          cls={stats.conversion >= 40 ? "green" : "amber"}
          gauge={stats.conversion}
        />
        <KpiCard
          label="Overdue quotations"
          value={stats.overdueCount}
          sub="untouched 7+ days"
          cls={stats.overdueCount > 0 ? "red" : "green"}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, marginBottom: 12 }}>Top-moving items</h3>
        {topMovers.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>No item activity in this period.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topMovers.map((t) => (
              <div
                key={t.label}
                style={{
                  fontSize: 11.5,
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: "var(--navy-panel2)",
                  border: "1px solid var(--grid-line)",
                }}
              >
                {t.label} <b className="mono">{t.qty.toLocaleString()}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, marginBottom: 12 }}>Attention required — overdue quotations (7+ days untouched)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ref.</th>
                <th>Brand(s)</th>
                <th>Salesman</th>
                <th>Value</th>
                <th>Status</th>
                <th>Idle</th>
              </tr>
            </thead>
            <tbody>
              {overdueRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Nothing overdue — every active quotation was touched within 7 days.
                  </td>
                </tr>
              ) : (
                overdueRows.map((q) => (
                  <tr key={q.id}>
                    <td className="mono">
                      <Link href={`/quotations/${q.id}`}>{quoteRef(q)}</Link>
                    </td>
                    <td>{displayBrand(q)}</td>
                    <td>{q.salesmanName}</td>
                    <td className="mono">{fmtMoney(q.quoteValue)}</td>
                    <td>
                      <span className={`status-pill status-${q.status.replace(/_/g, "-")}`}>{statusLabel(q.status)}</span>
                    </td>
                    <td className="mono">{daysSince(q.lastEditedAt)}d</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Team &amp; Synergy — workload balance and cross-brand opportunities</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Active quotations in system" value={synergyKpis.totalActive} />
        <KpiCard label="Avg. load per officer" value={synergyKpis.avgPerOfficer.toFixed(1)} />
        <KpiCard
          label="Busiest officer right now"
          value={synergyKpis.busiest ? synergyKpis.busiest.name.split(" ")[0] : "—"}
          sub={synergyKpis.busiest ? `${synergyKpis.busiest.activeCount} active` : ""}
        />
        <KpiCard label="Cross-sell customers found" value={crossBrandRows.length} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, marginBottom: 12 }}>Team workload — Quotation Officers</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Officer</th>
                <th>Active quotations</th>
                <th>Pipeline value</th>
                <th>Overdue owned</th>
                <th>Converted (all time)</th>
              </tr>
            </thead>
            <tbody>
              {officerRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No accounts can create quotations yet.
                  </td>
                </tr>
              ) : (
                officerRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="mono">{r.activeCount}</td>
                    <td className="mono">{fmtMoney(r.value)}</td>
                    <td className="mono" style={r.overdue > 0 ? { color: "var(--red)" } : undefined}>
                      {r.overdue}
                    </td>
                    <td className="mono">{r.converted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, marginBottom: 12 }}>Team workload — Salesmen</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Salesman</th>
                <th>Active quotations</th>
                <th>Pipeline value</th>
                <th>Win rate</th>
                <th>Flagged Lost</th>
              </tr>
            </thead>
            <tbody>
              {salesmanRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No Salesman accounts yet.
                  </td>
                </tr>
              ) : (
                salesmanRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="mono">{r.activeCount}</td>
                    <td className="mono">{fmtMoney(r.value)}</td>
                    <td className="mono">{r.winRate.toFixed(0)}%</td>
                    <td className="mono">{r.lost}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 13, marginBottom: 12 }}>Cross-brand synergy — same customer, multiple brands</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer (To)</th>
                <th>Brands quoted</th>
                <th>Quotations</th>
                <th>Combined value</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {crossBrandRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No single customer has been quoted across two or more brands yet.
                  </td>
                </tr>
              ) : (
                crossBrandRows.map((r) => (
                  <tr key={r.customer}>
                    <td>{r.customer}</td>
                    <td>{r.brands.join(" + ")}</td>
                    <td className="mono">{r.count}</td>
                    <td className="mono">{fmtMoney(r.value)}</td>
                    <td>
                      <span className="status-pill status-QUOTED">Cross-sell opportunity</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
