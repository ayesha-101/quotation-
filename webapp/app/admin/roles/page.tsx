import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import NewRoleForm from "./new-role-form";
import RoleRow from "./role-row";

export default async function AdminRolesPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Dashboard
      </Link>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Roles &amp; permissions</h1>
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
        Admin-only. A role approving GP needs a margin range that doesn&apos;t
        overlap any other approver role — every quotation&apos;s margin must
        land in exactly one role&apos;s range, or conversion to LPO can&apos;t
        be routed.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, marginBottom: 16 }}>New role</h2>
        <NewRoleForm />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Permissions</th>
              <th>Users</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <RoleRow
                key={r.id}
                role={{
                  id: r.id,
                  name: r.name,
                  isSystem: r.isSystem,
                  isAdmin: r.isAdmin,
                  canManageCatalog: r.canManageCatalog,
                  canManageUsers: r.canManageUsers,
                  canCreateQuotations: r.canCreateQuotations,
                  isSalesman: r.isSalesman,
                  canApproveGp: r.canApproveGp,
                  gpMin: r.gpMin,
                  gpMax: r.gpMax,
                  userCount: r._count.users,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
