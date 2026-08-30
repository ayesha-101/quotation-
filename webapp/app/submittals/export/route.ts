import { requireUser } from "@/lib/auth-guard";
import { departmentScope } from "@/lib/permissions";
import { prisma } from "@/lib/db";

// CSV, not a real .xlsx — see app/quotations/export/route.ts for why
// (the xlsx npm package has unpatched high-severity CVEs).
function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const user = await requireUser();

  const submittals = await prisma.submittal.findMany({
    where: departmentScope(user),
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Salesman",
    "Date",
    "Ref. No",
    "Material",
    "Brand",
    "Department",
    "Project",
    "Client",
    "Consultant",
    "Main Contractor",
    "MEP Contractor",
    "Value",
    "Status",
    "Remark",
  ];

  const rows = submittals.map((s) => [
    s.salesmanName,
    s.createdAt.toISOString().slice(0, 10),
    s.ref,
    s.materialName,
    s.brandName,
    s.department.name,
    s.projectName,
    s.employerName,
    s.consultantName,
    s.mainContractor,
    s.mepContractor,
    s.value != null ? s.value.toFixed(2) : "",
    s.status,
    s.remark,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submittals-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
