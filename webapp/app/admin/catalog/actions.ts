"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

function parseNum(formData: FormData, key: string): number {
  const v = parseFloat(String(formData.get(key) || ""));
  return Number.isFinite(v) ? v : 0;
}

export async function createCatalogItemAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const code = String(formData.get("code") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const uom = String(formData.get("uom") || "").trim();

  if (!code || !description || !brand || !uom) {
    return { error: "Code, description, brand, and unit are required." };
  }

  try {
    await prisma.catalogItem.create({
      data: {
        code,
        description,
        brand,
        uom,
        exWork: String(formData.get("exWork") || ""),
        currency: String(formData.get("currency") || "USD"),
        listPrice: parseNum(formData, "listPrice"),
        disPct: parseNum(formData, "disPct"),
        exRate: parseNum(formData, "exRate") || 3.68,
        freightPct: parseNum(formData, "freightPct"),
        dutyPct: parseNum(formData, "dutyPct"),
        adPct: parseNum(formData, "adPct"),
      },
    });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return { error: "This code already exists for this brand." };
    }
    throw e;
  }

  revalidatePath("/admin/catalog");
  return { success: true };
}

export async function updateCatalogItemAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const description = String(formData.get("description") || "").trim();
  const uom = String(formData.get("uom") || "").trim();
  if (!description || !uom) {
    return { error: "Description and unit are required." };
  }

  await prisma.catalogItem.update({
    where: { id: itemId },
    data: {
      description,
      uom,
      exWork: String(formData.get("exWork") || ""),
      currency: String(formData.get("currency") || "USD"),
      listPrice: parseNum(formData, "listPrice"),
      disPct: parseNum(formData, "disPct"),
      exRate: parseNum(formData, "exRate") || 3.68,
      freightPct: parseNum(formData, "freightPct"),
      dutyPct: parseNum(formData, "dutyPct"),
      adPct: parseNum(formData, "adPct"),
    },
  });

  revalidatePath("/admin/catalog");
  return { success: true };
}

export async function deleteCatalogItemAction(itemId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.catalogItem.delete({ where: { id: itemId } });
  revalidatePath("/admin/catalog");
  return { success: true };
}
