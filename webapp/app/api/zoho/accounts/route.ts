import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { searchZohoAccounts } from "@/lib/zoho";

export async function GET(request: Request) {
  await requireUser();

  const q = new URL(request.url).searchParams.get("q") || "";
  if (q.trim().length < 2) return NextResponse.json({ accounts: [] });

  try {
    const accounts = await searchZohoAccounts(q);
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error("Zoho account search failed:", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ accounts: [], error: `CRM lookup failed: ${detail}` }, { status: 502 });
  }
}
