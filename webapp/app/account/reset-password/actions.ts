"use server";

import { requireUser } from "@/lib/auth-guard";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export interface ResetPasswordState {
  error?: string;
}

export async function resetOwnPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const user = await requireUser();
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustResetPassword: false },
  });

  redirect("/");
}
