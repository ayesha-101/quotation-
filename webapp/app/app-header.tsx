import Link from "next/link";
import { canManageCatalog, canManageUsers } from "@/lib/permissions";
import { logoutAction } from "@/app/logout/actions";
import { prisma } from "@/lib/db";
import { formatQuoteRef } from "@/lib/quote-format";
import ThemeToggle from "@/app/theme-toggle";
import NotificationBell, { type NotificationGroups } from "@/app/notification-bell";

export type NavSection =
  | "dashboard"
  | "quotations"
  | "submittals"
  | "materials"
  | "approvals"
  | "catalog"
  | "users"
  | "roles"
  | "departments"
  | "security";

interface HeaderUser {
  id: string;
  roleId: string;
  departmentId: string;
  name: string;
  department: { name: string };
  role: {
    name: string;
    isAdmin: boolean;
    canManageCatalog: boolean;
    canManageUsers: boolean;
    canCreateQuotations: boolean;
    isSalesman: boolean;
    canApproveGp: boolean;
  };
}

const ACTIVE_STATUSES = ["DRAFT", "QUOTED", "UNDER_NEGOTIATION"] as const;
const OVERDUE_DAYS = 7;

// Capped at 25 per category instead of a separate count() query — one
// query does both the preview (first 3) and the badge total. This runs on
// every page nav (it's in the shared header), so keeping it to 3 cheap
// queries total matters for connection pressure on Neon's serverless pool.
const NOTIFICATION_CAP = 25;

async function loadNotifications(user: HeaderUser): Promise<NotificationGroups> {
  const scope = user.role.isAdmin ? {} : { departmentId: user.departmentId };
  const overdueCutoff = new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000);
  const canSeeApprovals = user.role.canApproveGp || user.role.isAdmin;

  const [approvals, overdue, mismatches] = await Promise.all([
    canSeeApprovals
      ? prisma.approval.findMany({
          where: { status: "PENDING", ...(user.role.isAdmin ? {} : { roleId: user.roleId }), quotation: scope },
          include: { quotation: true },
          orderBy: { requestedAt: "asc" },
          take: NOTIFICATION_CAP,
        })
      : Promise.resolve([]),
    prisma.quotation.findMany({
      where: { ...scope, status: { in: [...ACTIVE_STATUSES] }, lastEditedAt: { lte: overdueCutoff } },
      orderBy: { lastEditedAt: "asc" },
      take: NOTIFICATION_CAP,
    }),
    prisma.quotation.findMany({
      where: { ...scope, lpoMismatch: true },
      orderBy: { lastEditedAt: "desc" },
      take: NOTIFICATION_CAP,
    }),
  ]);

  return {
    approvals: approvals.slice(0, 3).map((a) => ({
      id: a.id,
      href: `/quotations/${a.quotationId}`,
      label: formatQuoteRef(a.quotation),
      detail: `${a.quotation.to || "—"} · ${a.quotation.gp.toFixed(1)}% GP`,
    })),
    overdue: overdue.slice(0, 3).map((q) => ({
      id: q.id,
      href: `/quotations/${q.id}`,
      label: formatQuoteRef(q),
      detail: q.to || "—",
    })),
    mismatches: mismatches.slice(0, 3).map((q) => ({
      id: q.id,
      href: `/quotations/${q.id}`,
      label: formatQuoteRef(q),
      detail: `LPO ${q.customerLpoNo || "(no ref)"}`,
    })),
    totalCount: approvals.length + overdue.length + mismatches.length,
  };
}

// Single persistent nav shared by every authenticated page, so moving
// between sections doesn't mean hunting for a "← Dashboard" link back to
// the one page that has links to everywhere else.
const EMPTY_NOTIFICATIONS: NotificationGroups = { approvals: [], overdue: [], mismatches: [], totalCount: 0 };

export default async function AppHeader({ user, active }: { user: HeaderUser; active: NavSection }) {
  // The header renders on every single page, so a transient DB hiccup in
  // this one query must never take the whole page down with it — better a
  // quiet bell than a global error boundary on every route.
  const notifications = await loadNotifications(user).catch((err) => {
    console.error("Notification bell query failed:", err);
    return EMPTY_NOTIFICATIONS;
  });
  const links: Array<{ id: NavSection; href: string; label: string; show: boolean }> = [
    { id: "dashboard", href: "/", label: "Dashboard", show: true },
    { id: "quotations", href: "/quotations", label: "Quotations", show: true },
    { id: "submittals", href: "/submittals", label: "Submittals", show: true },
    { id: "materials", href: "/materials", label: "Materials", show: true },
    { id: "approvals", href: "/approvals", label: "Approvals", show: user.role.canApproveGp || user.role.isAdmin },
    { id: "catalog", href: "/admin/catalog", label: "Catalog", show: canManageCatalog(user.role) },
    { id: "users", href: "/admin/users", label: "Users", show: canManageUsers(user.role) },
    { id: "roles", href: "/admin/roles", label: "Roles", show: user.role.isAdmin },
    { id: "departments", href: "/admin/departments", label: "Departments", show: user.role.isAdmin },
    { id: "security", href: "/security", label: "Security", show: user.role.isAdmin },
  ];

  return (
    <header className="app-header">
      <div className="app-header-top">
        <Link href="/" className="app-header-brand" style={{ textDecoration: "none" }}>
          <span className="app-header-wordmark">BMTC</span>
          <span className="app-header-tagline">Quotation &amp; LPO Control</span>
        </Link>
        <div className="app-header-user">
          <span>{user.name}</span>
          <span className="pill active">{user.role.name}</span>
          <span className="pill inactive">{user.role.isAdmin ? "All departments" : user.department.name}</span>
          <NotificationBell groups={notifications} />
          <ThemeToggle />
          <form action={logoutAction}>
            <button type="submit" className="btn" style={{ padding: "7px 14px", fontSize: 12 }}>
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="app-nav">
        {links
          .filter((l) => l.show)
          .map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={`app-nav-link${l.id === active ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
      </nav>
    </header>
  );
}
