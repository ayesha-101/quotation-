import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import ChainView from "./chain-view";

export default async function SecurityPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const records = await prisma.securityChainRecord.findMany({ orderBy: { seq: "asc" } });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Dashboard
      </Link>
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
  );
}
