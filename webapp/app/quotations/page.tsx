import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes, departmentScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import AppHeader from "@/app/app-header";

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase());
}

export default async function QuotationsPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const quotations = await prisma.quotation.findMany({
    where: departmentScope(user),
    orderBy: { createdAt: "desc" },
    include: { salesman: true, lines: true, department: true },
  });

  return (
    <>
      <AppHeader user={user} active="quotations" />
      <div className="page-wrap">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 22 }}>Quotation Tracker</h1>
        {canEditQuotes(user.role) && (
          <Link href="/quotations/new" className="btn primary">
            + New quotation
          </Link>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
        {canEditQuotes(user.role)
          ? "Full access — create quotations. Every change is logged with your name and timestamp."
          : "View-only."}
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ref.</th>
              {user.role.isAdmin && <th>Department</th>}
              <th>To</th>
              <th>Brand(s)</th>
              <th>Value</th>
              <th>GP%</th>
              <th>Status</th>
              <th>Salesman</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 ? (
              <tr>
                <td colSpan={user.role.isAdmin ? 8 : 7} className="empty-state">
                  No quotations yet.
                </td>
              </tr>
            ) : (
              quotations.map((q) => {
                const brands = Array.from(new Set(q.lines.map((l) => l.brand).filter(Boolean)));
                return (
                  <tr key={q.id}>
                    <td className="mono">
                      <Link href={`/quotations/${q.id}`}>
                        {q.quoteNo}
                        {q.revision > 0 ? `-R${q.revision}` : ""}
                      </Link>
                    </td>
                    {user.role.isAdmin && <td>{q.department.name}</td>}
                    <td>{q.to || "—"}</td>
                    <td>{brands.join(", ") || "—"}</td>
                    <td className="mono">{fmtMoney(q.quoteValue)}</td>
                    <td className="mono">{q.gp.toFixed(1)}%</td>
                    <td>
                      <span className={`status-pill status-${q.status.replace(/_/g, "-")}`}>
                        {statusLabel(q.status)}
                      </span>
                    </td>
                    <td>{q.salesman.name}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
