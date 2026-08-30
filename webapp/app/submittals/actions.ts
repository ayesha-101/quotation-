"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { canEditQuotes } from "@/lib/permissions";
import { extractPdfText } from "@/lib/pdf-text";

export interface ActionResult {
  error?: string;
  success?: boolean;
  id?: string;
}

export interface ExtractTextResult {
  error?: string;
  text?: string;
}

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

// Free, non-AI text extraction for a client-supplied index (PDF only —
// image OCR runs client-side via tesseract.js, no server round-trip
// needed). Same tradeoff already made for the LPO PDF feature: plain text
// out, no smart field-by-field parsing — that would need a paid AI call,
// which this project has twice now explicitly opted out of.
export async function extractSubmittalPdfTextAction(formData: FormData): Promise<ExtractTextResult> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };
  if (file.size > MAX_IMPORT_FILE_BYTES) return { error: "File is too large (max 10 MB)." };

  try {
    const data = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(data);
    return { text };
  } catch (e) {
    console.error("Submittal PDF text extraction failed:", e);
    return { error: "Couldn't read that PDF — is the file not corrupted?" };
  }
}

export interface IndexItemInput {
  description: string;
  status: "yes" | "no" | "na" | "";
}

export interface CustomFieldInput {
  title: string;
  value: string;
}

const STATUS_OPTIONS = [
  "Pending Submission",
  "Submitted",
  "Approved",
  "Approved with Comments",
  "Rejected",
  "Resubmitted",
] as const;

export async function createSubmittalAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditQuotes(user.role)) {
    return { error: "Only the Admin or a Quotation Officer can create submittals." };
  }

  const ref = String(formData.get("ref") || "").trim();
  const materialName = String(formData.get("materialName") || "").trim();
  const brandName = String(formData.get("brandName") || "").trim();
  if (!ref || !materialName || !brandName) {
    return { error: "Ref., Material, and Brand are required." };
  }

  let indexItems: IndexItemInput[];
  let customFields: CustomFieldInput[];
  try {
    indexItems = JSON.parse(String(formData.get("indexItems") || "[]"));
    customFields = JSON.parse(String(formData.get("customFields") || "[]"));
  } catch {
    return { error: "Malformed index items." };
  }

  const existing = await prisma.submittal.findUnique({
    where: { departmentId_ref: { departmentId: user.departmentId, ref } },
  });
  if (existing) {
    return { error: `Ref. "${ref}" already exists — use a unique reference.` };
  }

  const submittal = await prisma.submittal.create({
    data: {
      departmentId: user.departmentId,
      ref,
      materialName,
      brandName,
      projectName: String(formData.get("projectName") || ""),
      employerName: String(formData.get("employerName") || ""),
      consultantName: String(formData.get("consultantName") || ""),
      mainContractor: String(formData.get("mainContractor") || ""),
      mepContractor: String(formData.get("mepContractor") || ""),
      salesmanName: String(formData.get("salesmanName") || ""),
      customFields: customFields as object,
      indexItems: indexItems as object,
      createdById: user.id,
    },
  });

  revalidatePath("/submittals");
  return { success: true, id: submittal.id };
}

export async function updateSubmittalTrackingAction(
  submittalId: string,
  fields: { status?: string; remark?: string; value?: string }
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditQuotes(user.role)) {
    return { error: "Only the Admin or a Quotation Officer can update the tracker." };
  }

  const submittal = await prisma.submittal.findUnique({ where: { id: submittalId } });
  if (!submittal) return { error: "Submittal not found." };
  if (!user.role.isAdmin && submittal.departmentId !== user.departmentId) {
    return { error: "Submittal not found." };
  }

  const data: { status?: string; remark?: string; value?: number | null } = {};
  if (fields.status !== undefined) {
    if (!STATUS_OPTIONS.includes(fields.status as (typeof STATUS_OPTIONS)[number])) {
      return { error: "Invalid status." };
    }
    data.status = fields.status;
  }
  if (fields.remark !== undefined) data.remark = fields.remark;
  if (fields.value !== undefined) {
    const n = parseFloat(fields.value);
    data.value = Number.isFinite(n) ? n : null;
  }

  await prisma.submittal.update({ where: { id: submittalId }, data });
  revalidatePath("/submittals");
  return { success: true };
}

export async function deleteSubmittalAction(submittalId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canEditQuotes(user.role)) {
    return { error: "Only the Admin or a Quotation Officer can delete a submittal." };
  }

  const submittal = await prisma.submittal.findUnique({ where: { id: submittalId } });
  if (!submittal) return { error: "Submittal not found." };
  if (!user.role.isAdmin && submittal.departmentId !== user.departmentId) {
    return { error: "Submittal not found." };
  }

  await prisma.submittal.delete({ where: { id: submittalId } });
  revalidatePath("/submittals");
  return { success: true };
}
