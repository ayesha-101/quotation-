import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import AppHeader from "@/app/app-header";
import ChainView from "./chain-view";

export default async function SecurityPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const records = await prisma.securityChainRecord.findMany({ orderBy: { seq: "asc" } });

  return (
    <>
      <AppHeader user={admin} active="security" />
      <div className="page-wrap">
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Security &amp; audit chain</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Admin-only.
        </p>

        <ChainView
          records={records.map((r) => ({
            seq: r.seq,
            at: r.at.toISOString(),
            actor: r.actor,
            action: r.action,
            resource: r.resource,
            outcome: r.outcome,
            hash: r.hash,
          }))}
        />
      </div>
    </>
  );
}
