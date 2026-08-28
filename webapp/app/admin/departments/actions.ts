"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { appendChainEvent } from "@/lib/security-chain";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

interface DepartmentFields {
  name: string;
  code: string;
  quotePrefix: string;
  isActive: boolean;
}

function parseDepartmentFields(formData: FormData): DepartmentFields | { error: string } {
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const quotePrefix = String(formData.get("quotePrefix") || "").trim().toUpperCase();

  if (!name || !code || !quotePrefix) {
    return { error: "Name, code, and quote prefix are required." };
  }
  if (!/^[A-Z0-9]{2,10}$/.test(code)) {
    return { error: "Code must be 2-10 letters/numbers, e.g. MEC." };
  }
  if (!/^[A-Z0-9-]{2,20}$/.test(quotePrefix)) {
    return { error: "Quote prefix must be 2-20 letters/numbers/dashes, e.g. BMTC-MEC." };
  }

  return { name, code, quotePrefix, isActive: formData.get("isActive") === "on" };
}

export async function createDepartmentAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = parseDepartmentFields(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.department.create({ data: { ...parsed, isActive: true } });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: "A department with this name or code already exists." };
    }
    throw e;
  }

  await appendChainEvent({
    actor: admin.name,
    action: `Created department ${parsed.name} (${parsed.code})`,
    resource: "department-management",
    outcome: "success",
  });

  revalidatePath("/admin/departments");
  return { success: true };
}

export async function updateDepartmentAction(
  departmentId: string,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = parseDepartmentFields(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.department.update({ where: { id: departmentId }, data: parsed });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: "A department with this name or code already exists." };
    }
    throw e;
  }

  await appendChainEvent({
    actor: admin.name,
    action: `Edited department ${parsed.name} (${parsed.code})`,
    resource: "department-management",
    outcome: "success",
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/users");
  return { success: true };
}
