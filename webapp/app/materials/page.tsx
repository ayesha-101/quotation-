import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import AppHeader from "@/app/app-header";
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
    <>
      <AppHeader user={user} active="materials" />
      <div className="page-wrap">
        <MaterialsView quotations={quotations} />
      </div>
    </>
  );
}
