"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { appendChainEvent } from "@/lib/security-chain";

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

  // Approving the GP moves the LPO into the invoicing pipeline. The
  // status guard (only CONVERTED_TO_LPO advances) keeps this idempotent and
  // safe: a re-approval, or a quotation already invoiced/lost, is left
  // untouched instead of being yanked back to PENDING_INVOICE.
  let advancedToInvoicing = false;
  await prisma.$transaction(async (tx) => {
    await tx.approval.update({
      where: { id: approvalId },
      data: {
        status: decision,
        decidedById: user.id,
        decidedAt: new Date(),
        comment: comment.trim() || null,
      },
    });
    await tx.quotationAuditEntry.create({
      data: {
        quotationId: approval.quotationId,
        who: user.name,
        action:
          `LPO GP approval ${decision.toLowerCase()} by ${user.name}` +
          (comment.trim() ? `: "${comment.trim()}"` : ""),
      },
    });
    if (decision === "APPROVED") {
      const advanced = await tx.quotation.updateMany({
        where: { id: approval.quotationId, status: "CONVERTED_TO_LPO" },
        data: { status: "PENDING_INVOICE" },
      });
      if (advanced.count > 0) {
        advancedToInvoicing = true;
        await tx.quotationAuditEntry.create({
          data: {
            quotationId: approval.quotationId,
            who: user.name,
            action: "Ready for invoicing (GP approved) — sent to Sales Admin queue",
          },
        });
      }
    }
  });

  await appendChainEvent({
    actor: user.name,
    action:
      `LPO GP approval ${decision.toLowerCase()} by ${user.name}` +
      (comment.trim() ? `: "${comment.trim()}"` : ""),
    resource: `quotation:${approval.quotationId}`,
    outcome: "success",
  });

  if (advancedToInvoicing) {
    await appendChainEvent({
      actor: user.name,
      action: "LPO ready for invoicing (GP approved) — moved to Pending Invoices queue",
      resource: `quotation:${approval.quotationId}`,
      outcome: "success",
    });
  }

  revalidatePath("/approvals");
  revalidatePath(`/quotations/${approval.quotationId}`);
  revalidatePath("/invoicing");
  return { success: true };
}
