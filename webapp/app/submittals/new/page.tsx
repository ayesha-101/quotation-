import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes } from "@/lib/permissions";
import AppHeader from "@/app/app-header";
import SubmittalBuilder from "./submittal-builder";

export default async function NewSubmittalPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");
  if (!canEditQuotes(user.role)) redirect("/submittals");

  return (
    <>
      <AppHeader user={user} active="submittals" />
      <div className="page-wrap">
        <Link
          href="/submittals"
          style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
        >
          ← Submittal Tracker
        </Link>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>New submittal</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Build the cover page, index, and folder structure for a material submittal package.
        </p>
        <SubmittalBuilder defaultSalesman={user.name} />
      </div>
    </>
  );
}
