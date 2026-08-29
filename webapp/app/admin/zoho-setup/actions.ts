"use server";

import { requireAdmin } from "@/lib/auth-guard";

export interface ExchangeResult {
  error?: string;
  refreshToken?: string;
  accessToken?: string;
  expiresIn?: number;
}

// One-time-use utility: exchanges a Zoho "Self Client" grant code for a
// long-lived refresh token. Runs server-side (Vercel has open outbound
// network access, unlike this dev sandbox) — nothing here is stored;
// the admin copies the result into Vercel's env vars themselves.
export async function exchangeZohoGrantCodeAction(
  _prevState: ExchangeResult,
  formData: FormData
): Promise<ExchangeResult> {
  await requireAdmin();

  const clientId = String(formData.get("clientId") || "").trim();
  const clientSecret = String(formData.get("clientSecret") || "").trim();
  const code = String(formData.get("code") || "").trim();
  const accountsDomain = String(formData.get("accountsDomain") || "https://accounts.zoho.com").trim();

  if (!clientId || !clientSecret || !code) {
    return { error: "Fill in Client ID, Client Secret, and the Grant Token." };
  }

  const res = await fetch(`${accountsDomain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  const data = await res.json();

  if (!res.ok || !data.refresh_token) {
    return {
      error:
        data.error === "invalid_code"
          ? "That grant token has expired or was already used — generate a new one in Zoho API Console and try again."
          : `Zoho rejected the exchange: ${JSON.stringify(data)}`,
    };
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
