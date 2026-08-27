"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import catalogSeed from "@/prisma/catalog-seed.json";

export interface ActionResult {
  error?: string;
  success?: boolean;
  imported?: number;
}

const IMPORT_BATCH_SIZE = 500;

// One-time bulk import of the real BMTC master price catalog (3,128 items
// across 19 brands, sourced from the company's cost sheet). Safe to run
// more than once: skipDuplicates means an item already present for its
// [code, brand] is left untouched, never overwritten.
export async function importMasterCatalogAction(): Promise<ActionResult> {
  await requireAdmin();

  let imported = 0;
  for (let i = 0; i < catalogSeed.length; i += IMPORT_BATCH_SIZE) {
    const batch = catalogSeed.slice(i, i + IMPORT_BATCH_SIZE);
    const result = await prisma.catalogItem.createMany({
      data: batch,
      skipDuplicates: true,
    });
    imported += result.count;
  }

  revalidatePath("/admin/catalog");
  return { success: true, imported };
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
