"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

interface RoleFields {
  name: string;
  isAdmin: boolean;
  canManageCatalog: boolean;
  canManageUsers: boolean;
  canCreateQuotations: boolean;
  isSalesman: boolean;
  canApproveGp: boolean;
  gpMin: number | null;
  gpMax: number | null;
}

function parseRoleFields(formData: FormData): RoleFields | { error: string } {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  const canApproveGp = formData.get("canApproveGp") === "on";
  const gpMinRaw = String(formData.get("gpMin") || "").trim();
  const gpMaxRaw = String(formData.get("gpMax") || "").trim();
  const gpMin = gpMinRaw ? parseFloat(gpMinRaw) : null;
  const gpMax = gpMaxRaw ? parseFloat(gpMaxRaw) : null;

  if (canApproveGp && gpMin !== null && gpMax !== null && gpMin >= gpMax) {
    return { error: "The GP minimum must be less than the GP maximum." };
  }

  return {
    name,
    isAdmin: formData.get("isAdmin") === "on",
    canManageCatalog: formData.get("canManageCatalog") === "on",
    canManageUsers: formData.get("canManageUsers") === "on",
    canCreateQuotations: formData.get("canCreateQuotations") === "on",
    isSalesman: formData.get("isSalesman") === "on",
    canApproveGp,
    gpMin: canApproveGp ? gpMin : null,
    gpMax: canApproveGp ? gpMax : null,
  };
}

function rangesOverlap(
  aMin: number | null,
  aMax: number | null,
  bMin: number | null,
  bMax: number | null
): boolean {
  const aLo = aMin ?? -Infinity;
  const aHi = aMax ?? Infinity;
  const bLo = bMin ?? -Infinity;
  const bHi = bMax ?? Infinity;
  return aLo < bHi && bLo < aHi;
}

async function checkGpOverlap(fields: RoleFields, excludeRoleId?: string): Promise<string | null> {
  if (!fields.canApproveGp) return null;
  const others = await prisma.role.findMany({
    where: { canApproveGp: true, id: excludeRoleId ? { not: excludeRoleId } : undefined },
  });
  const clash = others.find((o) => rangesOverlap(fields.gpMin, fields.gpMax, o.gpMin, o.gpMax));
  if (clash) {
    return `This GP range overlaps with "${clash.name}" (${clash.gpMin ?? "−∞"}–${clash.gpMax ?? "∞"}%). Adjust the range so approver roles never compete for the same margin.`;
  }
  return null;
}

export async function createRoleAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseRoleFields(formData);
  if ("error" in parsed) return parsed;

  const overlapError = await checkGpOverlap(parsed);
  if (overlapError) return { error: overlapError };

  try {
    await prisma.role.create({ data: parsed });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: "A role with this name already exists." };
    }
    throw e;
  }

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function updateRoleAction(roleId: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseRoleFields(formData);
  if ("error" in parsed) return parsed;

  const overlapError = await checkGpOverlap(parsed, roleId);
  if (overlapError) return { error: overlapError };

  try {
    await prisma.role.update({ where: { id: roleId }, data: parsed });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: "A role with this name already exists." };
    }
    throw e;
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  await requireAdmin();

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { _count: { select: { users: true, approvals: true } } },
  });
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "Built-in roles can't be deleted." };
  if (role._count.users > 0) {
    return { error: `${role._count.users} user(s) still have this role — reassign them first.` };
  }
  if (role._count.approvals > 0) {
    return { error: "This role has approval history — it can't be deleted, only edited." };
  }

  await prisma.role.delete({ where: { id: roleId } });
  revalidatePath("/admin/roles");
  return { success: true };
}
