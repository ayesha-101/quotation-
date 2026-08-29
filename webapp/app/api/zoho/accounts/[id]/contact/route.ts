import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { getZohoAccountPrimaryContact } from "@/lib/zoho";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser();
  const { id } = await params;

  try {
    const contact = await getZohoAccountPrimaryContact(id);
    return NextResponse.json({ contact });
  } catch (e) {
    console.error("Zoho contact lookup failed:", e);
    return NextResponse.json({ contact: null, error: "CRM lookup unavailable." }, { status: 502 });
  }
}
