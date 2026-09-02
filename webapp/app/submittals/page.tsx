import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes, departmentScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import AppHeader from "@/app/app-header";
import TrackerRow from "./tracker-row";

export default async function SubmittalsPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const submittals = await prisma.submittal.findMany({
    where: departmentScope(user),
    include: { createdBy: true, department: true },
    orderBy: { createdAt: "desc" },
  });

  const canEdit = canEditQuotes(user.role);

  return (
    <>
      <AppHeader user={user} active="submittals" />
      <div className="page-wrap">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 6,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 22 }}>Submittal Tracker</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/submittals/export" className="btn">
              Export CSV ↓
            </a>
            {canEdit && (
              <Link href="/submittals/new" className="btn primary">
                + New submittal
              </Link>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Material submittal packages — cover page, index, and folder structure, tracked from first
          submission to final approval.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ref.</th>
                {user.role.isAdmin && <th>Department</th>}
                <th>Material</th>
                <th>Brand</th>
                <th>Project</th>
                <th>Salesman</th>
                <th>Status</th>
                <th>Remark</th>
                <th>Value</th>
                <th></th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {submittals.length === 0 ? (
                <tr>
                  <td colSpan={user.role.isAdmin ? (canEdit ? 11 : 10) : canEdit ? 10 : 9} className="empty-state">
                    No submittals yet.
                  </td>
                </tr>
              ) : (
                submittals.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">
                      <Link href={`/submittals/${s.id}/print`}>{s.ref}</Link>
                    </td>
                    {user.role.isAdmin && <td>{s.department.name}</td>}
                    <td>{s.materialName}</td>
                    <td>{s.brandName}</td>
                    <td>{s.projectName || "—"}</td>
                    <td>{s.salesmanName || "—"}</td>
                    <TrackerRow
                      id={s.id}
                      status={s.status}
                      remark={s.remark}
                      value={s.value != null ? String(s.value) : ""}
                      canEdit={canEdit}
                    />
                    {canEdit && (
                      <td>
                        <Link href={`/submittals/${s.id}/edit`} style={{ fontSize: 11.5 }}>
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
