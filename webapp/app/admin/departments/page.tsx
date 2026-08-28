import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import AppHeader from "@/app/app-header";
import NewDepartmentForm from "./new-department-form";
import DepartmentRow from "./department-row";

export default async function AdminDepartmentsPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, catalogItems: true, quotations: true } },
    },
  });

  return (
    <>
      <AppHeader user={admin} active="departments" />
      <div className="page-wrap" style={{ maxWidth: 1000 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Departments</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Admin-only. Each department gets its own catalog, quotation numbering, and users — a
          new department can create manual-entry quotations immediately, even with an empty
          catalog, while its real pricing rules and catalog get set up.
        </p>

        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, marginBottom: 16 }}>Add a department</h2>
          <NewDepartmentForm />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Quote numbering</th>
                <th>Status</th>
                <th>In use</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <DepartmentRow
                  key={d.id}
                  department={{
                    id: d.id,
                    name: d.name,
                    code: d.code,
                    quotePrefix: d.quotePrefix,
                    isActive: d.isActive,
                    userCount: d._count.users,
                    catalogCount: d._count.catalogItems,
                    quotationCount: d._count.quotations,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
