import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import AppHeader from "@/app/app-header";
import SubmittalBuilder, { type ExistingSubmittal } from "../../new/submittal-builder";
import type { CustomFieldInput, IndexItemInput } from "../../actions";

export default async function EditSubmittalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");
  if (!canEditQuotes(user.role)) redirect("/submittals");

  const { id } = await params;
  const s = await prisma.submittal.findUnique({ where: { id } });
  if (!s) notFound();
  if (!user.role.isAdmin && s.departmentId !== user.departmentId) notFound();

  const submittal: ExistingSubmittal = {
    id: s.id,
    ref: s.ref,
    materialName: s.materialName,
    brandName: s.brandName,
    projectName: s.projectName,
    employerName: s.employerName,
    consultantName: s.consultantName,
    mainContractor: s.mainContractor,
    mepContractor: s.mepContractor,
    salesmanName: s.salesmanName,
    customFields: (Array.isArray(s.customFields) ? s.customFields : []) as unknown as CustomFieldInput[],
    indexItems: (Array.isArray(s.indexItems) ? s.indexItems : []) as unknown as IndexItemInput[],
  };

  return (
    <>
      <AppHeader user={user} active="submittals" />
      <div className="page-wrap">
        <Link
          href={`/submittals/${s.id}/print`}
          style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
        >
          ← Back to {s.ref}
        </Link>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Edit submittal — {s.ref}</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Changes apply to the cover page, index, and folder structure — the tracker&apos;s status, remark,
          and value stay as they are (edit those from the Submittal Tracker instead).
        </p>
        <SubmittalBuilder defaultSalesman={user.name} submittal={submittal} />
      </div>
    </>
  );
}
