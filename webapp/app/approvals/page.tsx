import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import ApprovalRowActions from "./approval-row-actions";

type ApproverRole = "LINE_MANAGER" | "GM" | "CEO";

function asApproverRole(role: string): ApproverRole | null {
  return role === "LINE_MANAGER" || role === "GM" || role === "CEO" ? role : null;
}

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ApprovalsPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const approverRole = asApproverRole(user.role);

  const approvals = await prisma.approval.findMany({
    where: user.role === "ADMIN" ? {} : approverRole ? { tier: approverRole } : { id: "" },
    include: {
      quotation: { include: { lines: true } },
      decidedBy: true,
    },
    orderBy: { requestedAt: "desc" },
  });

  const note = approverRole
    ? `Showing GP approval requests routed to ${approverRole.replace(/_/g, " ")}. ≥10% GP → Line Manager · 5–10% GP → GM · <5% GP → CEO.`
    : user.role === "ADMIN"
      ? "Admin oversight view of all approval tiers — Admin does not decide these, only the routed approver can."
      : "Not applicable to your role.";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Dashboard
      </Link>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>GP Approval Queue</h1>
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>{note}</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ref.</th>
              <th>Brand(s)</th>
              <th>Value</th>
              <th>GP%</th>
              <th>Tier</th>
              <th>Requested</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  No approval requests in this queue.
                </td>
              </tr>
            ) : (
              approvals.map((a) => {
                const brands = Array.from(new Set(a.quotation.lines.map((l) => l.brand).filter(Boolean)));
                const canDecide = approverRole !== null && a.tier === approverRole && a.status === "PENDING";
                return (
                  <tr key={a.id}>
                    <td className="mono">
                      <Link href={`/quotations/${a.quotationId}`}>{a.quotation.quoteNo}</Link>
                    </td>
                    <td>{brands.join(", ") || "—"}</td>
                    <td className="mono">{fmtMoney(a.quotation.quoteValue)}</td>
                    <td className="mono">{a.quotation.gp.toFixed(1)}%</td>
                    <td>{a.tier.replace(/_/g, " ")}</td>
                    <td className="mono">{a.requestedAt.toLocaleDateString("en-AE")}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          a.status === "PENDING"
                            ? "status-QUOTED"
                            : a.status === "APPROVED"
                              ? "status-CONVERTED-TO-LPO"
                              : "status-LOST"
                        }`}
                      >
                        {a.status}
                      </span>
                      {a.status === "REJECTED" && a.comment && (
                        <div style={{ fontSize: 10.5, color: "var(--ink-dim)", marginTop: 4, maxWidth: 220 }}>
                          &quot;{a.comment}&quot;{" "}
                          <span style={{ color: "var(--ink-faint)" }}>— {a.decidedBy?.name}</span>
                        </div>
                      )}
                    </td>
                    <td>{canDecide ? <ApprovalRowActions approvalId={a.id} /> : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
