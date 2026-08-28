import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes, canManageCatalog, canManageUsers } from "@/lib/permissions";
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

  const cards = [
    {
      show: true,
      title: "Quotations",
      body: canEditQuotes(user.role)
        ? "Create quotations and track every one in the system."
        : "View every quotation in the system.",
      href: "/quotations",
      cta: "Quotation Tracker",
    },
    {
      show: true,
      title: "Material Tracker",
      body: "Quoted vs. converted quantities per item — a reorder signal.",
      href: "/materials",
      cta: "Material Tracker",
    },
    {
      show: user.role.canApproveGp || user.role.isAdmin,
      title: "GP approvals",
      body: user.role.isAdmin
        ? "Oversight view of every approval tier."
        : "Decide GP approval requests routed to you.",
      href: "/approvals",
      cta: "GP Approval Queue",
    },
    {
      show: canManageCatalog(user.role),
      title: "Pricing catalog",
      body: "Manage the catalog items and pricing inputs quotations are built from.",
      href: "/admin/catalog",
      cta: "Manage catalog",
    },
    {
      show: canManageUsers(user.role),
      title: "User access control",
      body: "Add, deactivate, or remove accounts, and reset passwords.",
      href: "/admin/users",
      cta: "Manage users",
    },
    {
      show: user.role.isAdmin,
      title: "Roles & permissions",
      body: "Create custom roles with their own permissions and, optionally, their own GP% approval range.",
      href: "/admin/roles",
      cta: "Manage roles",
    },
    {
      show: user.role.isAdmin,
      title: "Security & audit chain",
      body: "Hash-linked, server-appended log of every significant action — re-verify integrity any time.",
      href: "/security",
      cta: "View audit chain",
    },
  ];

  return (
    <>
      <AppHeader user={user} active="dashboard" />
      <div className="page-wrap">
        <DashboardAnalytics quotations={quotations} officers={officers} salesmen={salesmen} />

        <h2 style={{ fontSize: 15, marginBottom: 16, marginTop: 36 }}>Quick access</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {cards
            .filter((c) => c.show)
            .map((c) => (
              <div className="card" key={c.href}>
                <h2 style={{ fontSize: 14.5, marginBottom: 6 }}>{c.title}</h2>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-faint)",
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  {c.body}
                </p>
                <Link href={c.href} className="btn primary">
                  {c.cta} →
                </Link>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
