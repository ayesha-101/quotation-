import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import LpoMatchForm from "./lpo-match-form";
import FlagStatusButtons from "./flag-status-buttons";

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function canEditQuotes(role: string): boolean {
  return role === "ADMIN" || role === "QUOTATION_OFFICER";
}

const OPEN_STATUSES = ["DRAFT", "QUOTED", "UNDER_NEGOTIATION"];

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: {
      salesman: true,
      createdBy: true,
      lines: { orderBy: { position: "asc" } },
      auditLog: { orderBy: { at: "asc" } },
      approvals: { orderBy: { requestedAt: "desc" }, include: { decidedBy: true } },
    },
  });
  if (!q) notFound();

  const isOpen = OPEN_STATUSES.includes(q.status);
  const canConvert = canEditQuotes(user.role) && isOpen;
  const canFlag = user.role === "SALESMAN" && user.id === q.salesmanId && isOpen;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/quotations"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Quotation Tracker
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="mono" style={{ fontSize: 20 }}>
            {q.quoteNo}
            {q.revision > 0 ? `-R${q.revision}` : ""}
          </h1>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4 }}>
            {q.to || "—"} · {q.salesman.name}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/quotations/${q.id}/print`} target="_blank" className="btn">
            Preview / Print →
          </Link>
          <span className={`status-pill status-${q.status.replace(/_/g, "-")}`}>
            {q.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {q.lpoMismatch && (
        <div className="error-note">
          Unresolved LPO mismatch — the customer&apos;s LPO reference {q.customerLpoNo || "(none given)"}{" "}
          doesn&apos;t match this quotation. See the audit log below for details, then use Convert
          to LPO again to correct and re-check.
        </div>
      )}

      {(canConvert || canFlag) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {canConvert && <LpoMatchForm quotationId={q.id} lines={q.lines} />}
          {canFlag && <FlagStatusButtons quotationId={q.id} />}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>Line items</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Description</th>
                <th>Brand</th>
                <th>UOM</th>
                <th>Qty</th>
                <th>Unit sell</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l, i) => (
                <tr key={l.id}>
                  <td className="mono">{i + 1}</td>
                  <td className="mono">{l.code || "—"}</td>
                  <td>{l.description}</td>
                  <td>{l.brand}</td>
                  <td>{l.uom}</td>
                  <td className="mono">{l.qty}</td>
                  <td className="mono">{fmtMoney(l.unitSell)}</td>
                  <td className="mono">{fmtMoney(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals-box">
          <div className="line">
            <span>Quote value</span>
            <span className="mono">{fmtMoney(q.quoteValue)}</span>
          </div>
          <div className="line">
            <span>VAT (5%)</span>
            <span className="mono">{fmtMoney(q.vat)}</span>
          </div>
          <div className="line total">
            <span>Total</span>
            <span className="mono">{fmtMoney(q.totalValue)}</span>
          </div>
          <div className="line" style={{ marginTop: 8, borderTop: "1px dashed var(--grid-line)", paddingTop: 8 }}>
            <span>Internal margin (approval routing)</span>
            <span className="mono">{q.gp.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {q.approvals.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, marginBottom: 12 }}>GP approval</h2>
          {q.approvals.map((a) => (
            <div key={a.id} style={{ fontSize: 12.5, marginBottom: 6 }}>
              Routed to <b>{a.tier.replace(/_/g, " ")}</b> —{" "}
              <span className={`status-pill status-${a.status === "PENDING" ? "QUOTED" : a.status === "APPROVED" ? "CONVERTED-TO-LPO" : "LOST"}`}>
                {a.status}
              </span>
              {a.decidedBy && (
                <span style={{ color: "var(--ink-faint)" }}>
                  {" "}
                  by {a.decidedBy.name} on {a.decidedAt?.toLocaleDateString("en-AE")}
                </span>
              )}
              {a.comment && <div style={{ color: "var(--ink-dim)", marginTop: 2 }}>&quot;{a.comment}&quot;</div>}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>Audit log</h2>
        <div className="audit-log">
          {q.auditLog.map((a) => (
            <div key={a.id} style={{ marginBottom: 4 }}>
              <span className="mono" style={{ color: "var(--ink-faint)" }}>
                {a.at.toLocaleString()}
              </span>{" "}
              — {a.who}: {a.action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
