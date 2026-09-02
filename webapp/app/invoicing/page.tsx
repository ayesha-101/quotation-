import Link from "next/link";
import { redirect } from "next/navigation";
import { requireInvoicer } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { formatQuoteRef } from "@/lib/quote-format";
import AppHeader from "@/app/app-header";
import LivePoll from "@/app/live-poll";
import InvoiceRowActions from "./invoice-row-actions";

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Sales Admin works this queue across every department. Note what is
// selected: quote value and total (with VAT) — never `gp`. Margin is a
// manager-only figure and simply isn't read into this page, so it can't
// leak to the client bundle even by accident.
const PENDING_SELECT = {
  id: true,
  quoteNo: true,
  revision: true,
  status: true,
  to: true,
  project: true,
  customerLpoNo: true,
  quoteValue: true,
  totalValue: true,
  lastEditedAt: true,
  department: { select: { name: true } },
  salesman: { select: { name: true } },
} as const;

export default async function InvoicingPage() {
  const user = await requireInvoicer();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const [pending, recentlyInvoiced] = await Promise.all([
    prisma.quotation.findMany({
      where: { status: "PENDING_INVOICE" },
      select: PENDING_SELECT,
      orderBy: { lastEditedAt: "asc" },
    }),
    prisma.quotation.findMany({
      where: { status: "INVOICED" },
      select: {
        id: true,
        quoteNo: true,
        revision: true,
        status: true,
        to: true,
        customerLpoNo: true,
        totalValue: true,
        invoicedAt: true,
        department: { select: { name: true } },
        invoicedBy: { select: { name: true } },
      },
      orderBy: { invoicedAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <>
      <AppHeader user={user} active="invoicing" />
      <LivePoll intervalMs={5000} />
      <div className="page-wrap">
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Pending Invoices</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 24, lineHeight: 1.5 }}>
          Approved LPOs from every department, waiting to be invoiced. Margin
          is never shown here. Marking one <b>Done</b> is instant and final —
          if a colleague completes a row a moment before you, you&apos;ll be
          told it was already handled. This list refreshes on its own every
          few seconds.
        </p>

        <div className="table-wrap" style={{ marginBottom: 32 }}>
          <table>
            <thead>
              <tr>
                <th>Ref.</th>
                <th>Department</th>
                <th>Customer</th>
                <th>Project</th>
                <th>Customer LPO</th>
                <th>Value</th>
                <th>Total (incl. VAT)</th>
                <th>Waiting since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-state">
                    Nothing waiting to be invoiced right now.
                  </td>
                </tr>
              ) : (
                pending.map((q) => (
                  <tr key={q.id}>
                    {/* Ref links to the full quotation only for an Admin.
                        A Sales Admin must never reach that page: it shows
                        GP/margin and 404s cross-department anyway. */}
                    <td className="mono">
                      {user.role.isAdmin ? (
                        <Link href={`/quotations/${q.id}`}>{formatQuoteRef(q)}</Link>
                      ) : (
                        formatQuoteRef(q)
                      )}
                    </td>
                    <td>{q.department.name}</td>
                    <td>{q.to || "—"}</td>
                    <td>{q.project || "—"}</td>
                    <td className="mono">{q.customerLpoNo || "—"}</td>
                    <td className="mono">{fmtMoney(q.quoteValue)}</td>
                    <td className="mono">{fmtMoney(q.totalValue)}</td>
                    <td className="mono">{q.lastEditedAt.toLocaleDateString("en-AE")}</td>
                    <td>
                      <InvoiceRowActions quotationId={q.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {recentlyInvoiced.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 14, marginBottom: 12 }}>Recently invoiced</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ref.</th>
                    <th>Department</th>
                    <th>Customer</th>
                    <th>Customer LPO</th>
                    <th>Total (incl. VAT)</th>
                    <th>Invoiced by</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyInvoiced.map((q) => (
                    <tr key={q.id}>
                      <td className="mono">
                        {user.role.isAdmin ? (
                          <Link href={`/quotations/${q.id}`}>{formatQuoteRef(q)}</Link>
                        ) : (
                          formatQuoteRef(q)
                        )}
                      </td>
                      <td>{q.department.name}</td>
                      <td>{q.to || "—"}</td>
                      <td className="mono">{q.customerLpoNo || "—"}</td>
                      <td className="mono">{fmtMoney(q.totalValue)}</td>
                      <td>{q.invoicedBy?.name ?? "—"}</td>
                      <td className="mono">{q.invoicedAt?.toLocaleString("en-AE") ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
