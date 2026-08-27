import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes, canManageCatalog, canManageUsers } from "@/lib/permissions";
import { logoutAction } from "@/app/logout/actions";
import { prisma } from "@/lib/db";
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.8,
              color: "var(--brand)",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            BMTC
          </div>
          <h1 style={{ fontSize: 24 }}>Quotation &amp; LPO Control</h1>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 4 }}>
          Signed in as
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          {user.name}
        </div>
        <span className="pill active">{user.role.name}</span>
      </div>

      <DashboardAnalytics quotations={quotations} officers={officers} salesmen={salesmen} />

      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Quick access</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: 6 }}>Quotations</h2>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {canEditQuotes(user.role)
            ? "Create quotations and track every one in the system."
            : "View every quotation in the system."}
        </p>
        <Link href="/quotations" className="btn primary">
          Quotation Tracker →
        </Link>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: 6 }}>Material Tracker</h2>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Quoted vs. converted quantities per item — a reorder signal.
        </p>
        <Link href="/materials" className="btn primary">
          Material Tracker →
        </Link>
      </div>

      {(user.role.canApproveGp || user.role.isAdmin) && (
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>GP approvals</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {user.role.isAdmin
              ? "Oversight view of every approval tier."
              : "Decide GP approval requests routed to you."}
          </p>
          <Link href="/approvals" className="btn primary">
            GP Approval Queue →
          </Link>
        </div>
      )}

      {canManageUsers(user.role) && (
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>User access control</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Add, deactivate, or remove accounts, and reset passwords.
          </p>
          <Link href="/admin/users" className="btn primary">
            Manage users →
          </Link>
        </div>
      )}

      {user.role.isAdmin && (
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>Roles &amp; permissions</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Create custom roles with their own permissions and, optionally,
            their own GP% approval range.
          </p>
          <Link href="/admin/roles" className="btn primary">
            Manage roles →
          </Link>
        </div>
      )}

      {user.role.isAdmin && (
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>Security &amp; audit chain</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Hash-linked, server-appended log of every significant action —
            re-verify integrity any time.
          </p>
          <Link href="/security" className="btn primary">
            View audit chain →
          </Link>
        </div>
      )}

      {canManageCatalog(user.role) && (
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>Pricing catalog</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Manage the catalog items and pricing inputs quotations are built
            from.
          </p>
          <Link href="/admin/catalog" className="btn primary">
            Manage catalog →
          </Link>
        </div>
      )}
      </div>

      <div
        className="card"
        style={{ borderLeft: "3px solid var(--amber)" }}
      >
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>
          What&apos;s live here so far
        </h2>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-dim)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Real authentication, hashed passwords, session cookies, Admin-only
          user management, the pricing catalog, quotation creation, LPO
          matching, GP approval routing (with dynamic, admin-configurable
          roles and margin ranges), revisions, a printable quotation
          matching the real BMTC template, and this dashboard&apos;s live
          analytics — all backed by a real Postgres database.
        </p>
      </div>
    </div>
  );
}
