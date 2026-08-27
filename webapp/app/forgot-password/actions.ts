"use server";

import { prisma } from "@/lib/db";
import { generateResetToken } from "@/lib/reset-token";
import { sendPasswordResetEmail } from "@/lib/email";
import { appendChainEvent } from "@/lib/security-chain";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic {success:true} is returned whether or not this email
  // belongs to a real account — a distinct "no such user" response would
  // let anyone enumerate valid emails by trying addresses here.
  if (user && user.isActive) {
    const { raw, tokenHash, expiresAt } = generateResetToken();
    try {
      await prisma.$transaction([
        // Old unused links for this user stop working once a new one is
        // requested, so an inbox full of old reset emails can't be replayed.
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
        }),
      ]);
      await sendPasswordResetEmail(email, raw);
      await appendChainEvent({
        actor: email,
        action: `Password reset link sent to ${email}`,
        resource: "auth",
        outcome: "success",
      });
    } catch (e) {
      await appendChainEvent({
        actor: email,
        action: `Password reset email failed to send to ${email}`,
        resource: "auth",
        outcome: "failure",
      });
      console.error("Failed to send password reset email:", e);
      // Still return the generic success message — surfacing a delivery
      // failure here would confirm the email is a real account.
    }
  }

  return { success: true };
}
