"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/lib/reset-token";
import { appendChainEvent } from "@/lib/security-chain";
import { redirect } from "next/navigation";

export interface ResetViaTokenState {
  error?: string;
}

const INVALID_MESSAGE = "This link is invalid or has expired. Request a new one.";

export async function resetPasswordViaTokenAction(
  _prevState: ResetViaTokenState,
  formData: FormData
): Promise<ResetViaTokenState> {
  const token = String(formData.get("token") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
    return { error: INVALID_MESSAGE };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        mustResetPassword: false,
        failedAttempts: 0,
        lockedUntil: null,
      },
    }),
    // Every unused token for this user is spent, not just the one used —
    // otherwise an older reset email still sitting in an inbox would work
    // right after this one, which defeats "one link, one use".
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);

  await appendChainEvent({
    actor: record.user.email,
    action: `Password reset via emailed link for ${record.user.email}`,
    resource: "auth",
    outcome: "success",
  });

  redirect("/login?reset=1");
}
