"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function decideApprovalAction(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  comment: string
): Promise<ActionResult> {
  const user = await requireUser();

  const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!approval) return { error: "Approval request not found." };
  if (approval.roleId !== user.roleId) {
    return { error: "This approval isn't routed to your role." };
  }
  if (approval.status !== "PENDING") {
    return { error: "This approval was already decided." };
  }
  if (decision === "REJECTED" && !comment.trim()) {
    return { error: "A reason is required so the quotation's owner knows what to fix." };
  }

  await prisma.$transaction([
    prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: decision,
        decidedById: user.id,
        decidedAt: new Date(),
        comment: comment.trim() || null,
      },
    }),
    prisma.quotationAuditEntry.create({
      data: {
        quotationId: approval.quotationId,
        who: user.name,
        action:
          `LPO GP approval ${decision.toLowerCase()} by ${user.name}` +
          (comment.trim() ? `: "${comment.trim()}"` : ""),
      },
    }),
  ]);

  revalidatePath("/approvals");
  revalidatePath(`/quotations/${approval.quotationId}`);
  return { success: true };
}
