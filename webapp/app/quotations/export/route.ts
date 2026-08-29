import { requireUser } from "@/lib/auth-guard";
import { departmentScope } from "@/lib/permissions";
import { formatQuoteRef } from "@/lib/quote-format";
import { prisma } from "@/lib/db";

// CSV, not a real .xlsx binary — opens directly in Excel/Sheets with zero
// added dependencies. (The `xlsx` npm package has unpatched high-severity
// CVEs — see GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9 — and there's no
// upside to a real binary format here, so this was the deliberate choice.)
function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const user = await requireUser();

  const quotations = await prisma.quotation.findMany({
    where: departmentScope(user),
    include: { salesman: true, department: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Ref.",
    "Department",
    "To",
    "Status",
    "Quote value",
    "VAT",
    "Total value",
    "GP %",
    "Salesman",
    "Customer LPO No.",
    "Created at",
  ];

  const rows = quotations.map((q) => [
    formatQuoteRef(q),
    q.department.name,
    q.to,
    q.status.replace(/_/g, " "),
    q.quoteValue.toFixed(2),
    q.vat.toFixed(2),
    q.totalValue.toFixed(2),
    q.gp.toFixed(1),
    q.salesman.name,
    q.customerLpoNo,
    q.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
