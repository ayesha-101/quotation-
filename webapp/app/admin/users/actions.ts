"use server";

import { prisma } from "@/lib/db";
import { requireUserManager } from "@/lib/auth-guard";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { appendChainEvent } from "@/lib/security-chain";
import { sendWelcomeEmail } from "@/lib/email";
import type { Prisma } from "@prisma/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateUserState {
  error?: string;
  success?: boolean;
  tempPassword?: string;
  email?: string;
  emailSent?: boolean;
}

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await requireUserManager();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const roleId = String(formData.get("roleId") || "");
  // A department-scoped user manager can only ever add users to their own
  // department — the submitted departmentId is trusted only from a full
  // Admin, who's allowed to place a user in any department.
  const departmentId = admin.role.isAdmin
    ? String(formData.get("departmentId") || "")
    : admin.departmentId;

  if (!name || !email || !roleId || !departmentId) {
    return { error: "Fill in name, email, role, and department." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  const [role, department] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.department.findUnique({ where: { id: departmentId } }),
  ]);
  if (!role) {
    return { error: "Choose a valid role." };
  }
  if (!department) {
    return { error: "Choose a valid department." };
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
        roleId,
        departmentId,
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

  await appendChainEvent({
    actor: admin.name,
    action: `Created user ${email} (${role.name}, ${department.name})`,
    resource: "user-management",
    outcome: "success",
  });

  let emailSent = false;
  try {
    await sendWelcomeEmail(email, name, tempPassword);
    emailSent = true;
  } catch (e) {
    // Non-fatal: the admin still sees the temp password below and can
    // relay it themselves — see the emailSent flag rendered in the UI.
    console.error("Failed to send welcome email:", e);
  }
  await appendChainEvent({
    actor: admin.name,
    action: emailSent
      ? `Welcome email sent to ${email}`
      : `Welcome email failed to send to ${email}`,
    resource: "user-management",
    outcome: emailSent ? "success" : "failure",
  });

  revalidatePath("/admin/users");
  return { success: true, tempPassword, email, emailSent };
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
// fn must do its reads/writes through the tx client it's given, never the
// outer `prisma` — a closure over the outer client would run its queries
// as independent, non-transactional statements, and the whole point of
// Serializable here is to make the "is this the last Admin" check and the
// delete/deactivate atomic against a concurrent identical check.
async function withSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: "Serializable" });
}

const RETRY_ERROR = { error: "That conflicted with another change — try again." };

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireUserManager();

  if (userId === admin.id) {
    return { error: "You can't delete your own account." };
  }

  type DeleteResult = ActionResult & { email?: string };

  try {
    const result = await withSerializable<DeleteResult>(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!target) return { error: "User not found." };
      if (!admin.role.isAdmin && target.departmentId !== admin.departmentId) {
        return { error: "User not found." };
      }

      if (target.role.isAdmin) {
        const adminCount = await tx.user.count({ where: { role: { isAdmin: true } } });
        if (adminCount <= 1) {
          return { error: "Can't delete the last remaining Admin." };
        }
      }

      await tx.user.delete({ where: { id: userId } });
      return { success: true, email: target.email };
    });
    if (result.success) {
      await appendChainEvent({
        actor: admin.name,
        action: `Deleted user ${result.email}`,
        resource: "user-management",
        outcome: "success",
      });
      revalidatePath("/admin/users");
    }
    return result;
  } catch {
    return RETRY_ERROR;
  }
}

export async function toggleActiveAction(userId: string): Promise<ActionResult> {
  const admin = await requireUserManager();

  if (userId === admin.id) {
    return { error: "You can't deactivate your own account." };
  }

  type ToggleResult = ActionResult & { email?: string; nowActive?: boolean };

  try {
    const result = await withSerializable<ToggleResult>(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!target) return { error: "User not found." };
      if (!admin.role.isAdmin && target.departmentId !== admin.departmentId) {
        return { error: "User not found." };
      }

      if (target.isActive && target.role.isAdmin) {
        const activeAdminCount = await tx.user.count({
          where: { role: { isAdmin: true }, isActive: true },
        });
        if (activeAdminCount <= 1) {
          return { error: "Can't deactivate the last active Admin." };
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: { isActive: !target.isActive },
      });
      return { success: true, email: target.email, nowActive: !target.isActive };
    });
    if (result.success) {
      await appendChainEvent({
        actor: admin.name,
        action: `${result.nowActive ? "Reactivated" : "Deactivated"} user ${result.email}`,
        resource: "user-management",
        outcome: "success",
      });
      revalidatePath("/admin/users");
    }
    return result;
  } catch {
    return RETRY_ERROR;
  }
}

export async function resetPasswordAction(userId: string): Promise<ActionResult> {
  const admin = await requireUserManager();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };
  if (!admin.role.isAdmin && target.departmentId !== admin.departmentId) {
    return { error: "User not found." };
  }

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

  await appendChainEvent({
    actor: admin.name,
    action: `Reset password for user ${target.email}`,
    resource: "user-management",
    outcome: "success",
  });

  revalidatePath("/admin/users");
  return { success: true, tempPassword };
}
