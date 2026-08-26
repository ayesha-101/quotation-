"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;
const GENERIC_ERROR = "Incorrect email or password.";

// A real bcrypt hash of a value nobody will ever type, used only so that a
// login for a non-existent email takes about as long as one for a real
// email with a wrong password — otherwise the early-return for "no such
// user" responds measurably faster than a real bcrypt.compare(), letting
// an attacker enumerate valid emails purely from response timing.
const DUMMY_HASH =
  "$2b$12$ehlxsYZJt2Q.ZN8puLECOOiuAMIw2tLnTknCQ7qkabZ5pSm1ejNCW";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    // Still run bcrypt against a dummy hash so this branch takes roughly
    // the same time as a real user with a wrong password (see DUMMY_HASH).
    await verifyPassword(password, DUMMY_HASH);
    return { error: GENERIC_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    // Deliberately the same generic message as "wrong password" / "no such
    // user" — a distinct "account locked" message would let an attacker
    // confirm an email is a real, active account just by trying 5 wrong
    // passwords and reading which error comes back on the 6th attempt.
    return { error: GENERIC_ERROR };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: attempts,
        lockedUntil:
          attempts >= LOCK_THRESHOLD
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null,
      },
    });
    return { error: GENERIC_ERROR };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  await createSession({ userId: user.id, role: user.role, name: user.name });

  redirect(
    user.mustResetPassword
      ? "/account/reset-password"
      : next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/"
  );
}
