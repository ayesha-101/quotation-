import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { departmentScope } from "@/lib/permissions";
import { formatQuoteRef } from "@/lib/quote-format";
import { prisma } from "@/lib/db";
import AppHeader from "./app-header";
import DashboardAnalytics, { type DashboardQuotation } from "./dashboard-analytics";
import RecentActivity from "./recent-activity";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const [quotationRows, officers, salesmen] = await Promise.all([
    prisma.quotation.findMany({
      where: departmentScope(user),
      include: { lines: true, salesman: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { ...departmentScope(user), OR: [{ role: { canCreateQuotations: true } }, { role: { isAdmin: true } }] },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { ...departmentScope(user), role: { isSalesman: true } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Fetched separately from the core dashboard queries above, and never
  // allowed to fail the whole page — "recent activity" is a nice-to-have,
  // not something worth a blank dashboard over.
  const recentAuditRows = await prisma.quotationAuditEntry
    .findMany({
      where: { quotation: departmentScope(user) },
      include: { quotation: true },
      orderBy: { at: "desc" },
      take: 15,
    })
    .catch((err) => {
      console.error("Recent activity query failed:", err);
      return [];
    });

  const recentActivity = recentAuditRows.map((a) => ({
    id: a.id,
    quotationId: a.quotationId,
    ref: formatQuoteRef(a.quotation),
    who: a.who,
    action: a.action,
    at: a.at.toISOString(),
  }));

  const quotations: DashboardQuotation[] = quotationRows.map((q) => ({
    id: q.id,
    quoteNo: q.quoteNo,
    revision: q.revision,
    status: q.status,
    quoteValue: q.quoteValue,
    gp: q.gp,
    to: q.to,
    createdAt: q.createdAt.toISOString(),
    lastEditedAt: q.lastEditedAt.toISOString(),
    salesmanId: q.salesmanId,
    salesmanName: q.salesman.name,
    createdById: q.createdById,
    createdByName: q.createdBy.name,
    lines: q.lines.map((l) => ({ code: l.code, description: l.description, brand: l.brand, qty: l.qty })),
  }));

  return (
    <>
      <AppHeader user={user} active="dashboard" />
      <div className="page-wrap">
        <DashboardAnalytics quotations={quotations} officers={officers} salesmen={salesmen} />
        <RecentActivity entries={recentActivity} />
      </div>
    </>
  );
}
