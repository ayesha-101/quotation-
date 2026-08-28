import Link from "next/link";
import { canManageCatalog, canManageUsers } from "@/lib/permissions";
import { logoutAction } from "@/app/logout/actions";

export type NavSection =
  | "dashboard"
  | "quotations"
  | "materials"
  | "approvals"
  | "catalog"
  | "users"
  | "roles"
  | "departments"
  | "security";

interface HeaderUser {
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

// Single persistent nav shared by every authenticated page, so moving
// between sections doesn't mean hunting for a "← Dashboard" link back to
// the one page that has links to everywhere else.
export default function AppHeader({ user, active }: { user: HeaderUser; active: NavSection }) {
  const links: Array<{ id: NavSection; href: string; label: string; show: boolean }> = [
    { id: "dashboard", href: "/", label: "Dashboard", show: true },
    { id: "quotations", href: "/quotations", label: "Quotations", show: true },
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
