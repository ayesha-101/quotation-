import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type RoleValue } from "@/lib/roles";
import CreateUserForm from "./create-user-form";
import UserRowActions from "./user-row-actions";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Dashboard
      </Link>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>User access control</h1>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ink-faint)",
          marginBottom: 28,
          lineHeight: 1.5,
        }}
      >
        Admin-only. Deleting or deactivating a user takes effect on their
        very next request — sessions aren&apos;t just trusted until they
        expire.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, marginBottom: 16 }}>Add a user</h2>
        <CreateUserForm />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ color: "var(--ink)" }}>
                  {u.name}
                  {u.id === admin.id && (
                    <span style={{ color: "var(--ink-faint)" }}> (you)</span>
                  )}
                </td>
                <td className="mono">{u.email}</td>
                <td>{ROLE_LABELS[u.role as RoleValue]}</td>
                <td>
                  <span className={`pill ${u.isActive ? "active" : "inactive"}`}>
                    {u.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td>
                  <UserRowActions
                    userId={u.id}
                    isActive={u.isActive}
                    isSelf={u.id === admin.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
