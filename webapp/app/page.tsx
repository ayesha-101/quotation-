import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import AppHeader from "./app-header";
import DashboardAnalytics, { type DashboardQuotation } from "./dashboard-analytics";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const [quotationRows, officers, salesmen] = await Promise.all([
    prisma.quotation.findMany({
      include: { lines: true, salesman: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { OR: [{ role: { canCreateQuotations: true } }, { role: { isAdmin: true } }] },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { isSalesman: true } },
      orderBy: { name: "asc" },
    }),
  ]);

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
      </div>
    </>
  );
}
