"use server";

import { prisma } from "@/lib/db";
import { requireCatalogManager } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { appendChainEvent } from "@/lib/security-chain";
import catalogSeed from "@/prisma/catalog-seed.json";

const NOT_FOUND: ActionResult = { error: "Catalog item not found." };

// Non-Admin catalog managers only ever act within their own department —
// fetch first and check rather than trusting a departmentId in the where
// clause, so a mismatch reads as "not found" instead of leaking whether an
// id exists in a department the caller can't see.
async function findOwnCatalogItem(itemId: string, user: { role: { isAdmin: boolean }; departmentId: string }) {
  const item = await prisma.catalogItem.findUnique({ where: { id: itemId } });
  if (!item) return null;
  if (!user.role.isAdmin && item.departmentId !== user.departmentId) return null;
  return item;
}

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
  const user = await requireCatalogManager();

  let imported = 0;
  for (let i = 0; i < catalogSeed.length; i += IMPORT_BATCH_SIZE) {
    const batch = catalogSeed.slice(i, i + IMPORT_BATCH_SIZE);
    const result = await prisma.catalogItem.createMany({
      data: batch.map((item) => ({ ...item, departmentId: user.departmentId })),
      skipDuplicates: true,
    });
    imported += result.count;
  }

  await appendChainEvent({
    actor: user.name,
    action: `Imported master catalog (${imported} new item(s))`,
    resource: "catalog",
    outcome: "success",
  });

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
  const user = await requireCatalogManager();

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
        departmentId: user.departmentId,
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

  await appendChainEvent({
    actor: user.name,
    action: `Added catalog item ${code} (${brand})`,
    resource: "catalog",
    outcome: "success",
  });

  revalidatePath("/admin/catalog");
  return { success: true };
}

export async function updateCatalogItemAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireCatalogManager();

  const existing = await findOwnCatalogItem(itemId, user);
  if (!existing) return NOT_FOUND;

  const description = String(formData.get("description") || "").trim();
  const uom = String(formData.get("uom") || "").trim();
  if (!description || !uom) {
    return { error: "Description and unit are required." };
  }

  const item = await prisma.catalogItem.update({
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

  await appendChainEvent({
    actor: user.name,
    action: `Edited catalog item ${item.code} (${item.brand})`,
    resource: "catalog",
    outcome: "success",
  });

  revalidatePath("/admin/catalog");
  return { success: true };
}

export async function deleteCatalogItemAction(itemId: string): Promise<ActionResult> {
  const user = await requireCatalogManager();

  const existing = await findOwnCatalogItem(itemId, user);
  if (!existing) return NOT_FOUND;

  const item = await prisma.catalogItem.delete({ where: { id: itemId } });

  await appendChainEvent({
    actor: user.name,
    action: `Deleted catalog item ${item.code} (${item.brand})`,
    resource: "catalog",
    outcome: "success",
  });

  revalidatePath("/admin/catalog");
  return { success: true };
}
