"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateUserState {
  error?: string;
  success?: boolean;
  tempPassword?: string;
  email?: string;
}

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") || "");

  if (!name || !email || !role) {
    return { error: "Fill in name, email, and role." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!(ROLES as readonly string[]).includes(role)) {
    return { error: "Choose a valid role." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        role: role as (typeof ROLES)[number],
        passwordHash,
        createdById: admin.id,
      },
    });
  } catch (e) {
    // Two concurrent submissions for the same email: the findUnique above
    // can't catch that, but the column's unique constraint does.
    if (
      e instanceof Error &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "A user with this email already exists." };
    }
    throw e;
  }

  revalidatePath("/admin/users");
  return { success: true, tempPassword, email };
}

export interface ActionResult {
  error?: string;
  success?: boolean;
  tempPassword?: string;
}

// The "don't remove the last Admin" checks below run as a Serializable
// transaction, not a plain read-then-write: two admins concurrently
// deactivating/deleting the *other* two remaining admins could otherwise
// both read count===2, both pass the <=1 check, and leave zero admins
// with no way back in. Serializable isolation makes Postgres abort one
// of the two conflicting transactions instead.
async function withSerializable<T>(fn: () => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: "Serializable" });
}

const RETRY_ERROR = { error: "That conflicted with another change — try again." };

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "You can't delete your own account." };
  }

  try {
    const result = await withSerializable(async () => {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return { error: "User not found." } as ActionResult;

      if (target.role === "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          return { error: "Can't delete the last remaining Admin." } as ActionResult;
        }
      }

      await prisma.user.delete({ where: { id: userId } });
      return { success: true } as ActionResult;
    });
    if (result.success) revalidatePath("/admin/users");
    return result;
  } catch {
    return RETRY_ERROR;
  }
}

export async function toggleActiveAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: "You can't deactivate your own account." };
  }

  try {
    const result = await withSerializable(async () => {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return { error: "User not found." } as ActionResult;

      if (target.isActive && target.role === "ADMIN") {
        const activeAdminCount = await prisma.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (activeAdminCount <= 1) {
          return { error: "Can't deactivate the last active Admin." } as ActionResult;
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: !target.isActive },
      });
      return { success: true } as ActionResult;
    });
    if (result.success) revalidatePath("/admin/users");
    return result;
  } catch {
    return RETRY_ERROR;
  }
}

export async function resetPasswordAction(userId: string): Promise<ActionResult> {
  await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustResetPassword: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  revalidatePath("/admin/users");
  return { success: true, tempPassword };
}
