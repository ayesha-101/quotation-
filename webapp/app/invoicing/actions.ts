"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { canInvoice } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { appendChainEvent } from "@/lib/security-chain";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

// Marks a Pending Invoice done. The write is a single status-guarded
// updateMany (WHERE status = 'PENDING_INVOICE'), so two Sales Admins
// clicking "Done" on the same row at the same moment can't both succeed:
// Postgres applies one, the other matches zero rows and gets told it was
// already completed. No read-then-write gap to lose the race in.
export async function markInvoicedAction(quotationId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canInvoice(user.role)) {
    return { error: "Only a Sales Admin can mark invoices done." };
  }

  const done = await prisma.$transaction(async (tx) => {
    const res = await tx.quotation.updateMany({
      where: { id: quotationId, status: "PENDING_INVOICE" },
      data: { status: "INVOICED", invoicedById: user.id, invoicedAt: new Date() },
    });
    if (res.count === 0) return false;
    await tx.quotationAuditEntry.create({
      data: { quotationId, who: user.name, action: "Invoiced — marked done by Sales Admin" },
    });
    return true;
  });

  if (!done) {
    // Either already invoiced by another employee (the double-click race
    // the plan calls out) or the row isn't actually pending invoice.
    return { error: "This was already completed by another employee." };
  }

  await appendChainEvent({
    actor: user.name,
    action: "Invoiced — marked done from Pending Invoices queue",
    resource: `quotation:${quotationId}`,
    outcome: "success",
  });

  revalidatePath("/invoicing");
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/");
  return { success: true };
}
