import { redirect } from "next/navigation";
import { requireUserManager } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { departmentScope } from "@/lib/permissions";
import AppHeader from "@/app/app-header";
import CreateUserForm from "./create-user-form";
import UserRowActions from "./user-row-actions";

export default async function AdminUsersPage() {
  const admin = await requireUserManager();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const [users, roles, departments] = await Promise.all([
    prisma.user.findMany({
      where: departmentScope(admin),
      orderBy: { createdAt: "asc" },
      include: { role: true, department: true },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    admin.role.isAdmin ? prisma.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <>
      <AppHeader user={admin} active="users" />
      <div className="page-wrap" style={{ maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>User access control</h1>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ink-faint)",
          marginBottom: 28,
          lineHeight: 1.5,
        }}
      >
        Requires user management access. Deleting or deactivating a user takes effect on their
        very next request — sessions aren&apos;t just trusted until they
        expire.
      </p>

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, marginBottom: 16 }}>Add a user</h2>
        <CreateUserForm roles={roles} departments={departments} homeDepartmentName={admin.department.name} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              {admin.role.isAdmin && <th>Department</th>}
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
                <td>{u.role.name}</td>
                {admin.role.isAdmin && <td>{u.department.name}</td>}
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
    </>
  );
}
