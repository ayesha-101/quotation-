import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import MaterialsView from "./materials-view";

export default async function MaterialsPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const quotationRows = await prisma.quotation.findMany({
    select: {
      status: true,
      createdAt: true,
      lines: { select: { code: true, description: true, brand: true, qty: true } },
    },
  });

  const quotations = quotationRows.map((q) => ({
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    lines: q.lines,
  }));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Dashboard
      </Link>
      <MaterialsView quotations={quotations} />
    </div>
  );
}
