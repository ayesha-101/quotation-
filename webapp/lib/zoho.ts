// Minimal Zoho CRM v6 client: OAuth token refresh + the handful of calls the
// quotation builder needs (search Accounts, read an Account's primary
// Contact). Auth is the "Self Client" grant flow — a one-time grant token
// exchanged for a long-lived refresh token (see the setup steps given to
// the user), not an interactive per-user login.

const ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com";
const API_DOMAIN = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com";

// .trim() guards against a stray trailing newline/space from copy-pasting
// the value into Vercel's env var UI — Zoho rejects the token outright if
// so, with an error that doesn't hint at whitespace being the cause.
function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }
  const clientId = requireEnv("ZOHO_CLIENT_ID");
  const clientSecret = requireEnv("ZOHO_CLIENT_SECRET");
  const refreshToken = requireEnv("ZOHO_REFRESH_TOKEN");

  const res = await fetch(`${ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

async function zohoFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${API_DOMAIN}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Zoho-oauthtoken ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho API ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export interface ZohoAccountResult {
  id: string;
  name: string;
  phone: string | null;
}

/** Search Accounts by name, for the quotation builder's "To" autocomplete. */
export async function searchZohoAccounts(query: string): Promise<ZohoAccountResult[]> {
  if (!query.trim()) return [];
  const criteria = encodeURIComponent(`(Account_Name:starts_with:${query})`);
  const data = await zohoFetch(
    `/crm/v6/Accounts/search?criteria=${criteria}&fields=Account_Name,Phone&per_page=10`
  );
  const records = (data.data ?? []) as Array<{ id: string; Account_Name: string; Phone: string | null }>;
  return records.map((r) => ({ id: r.id, name: r.Account_Name, phone: r.Phone }));
}

export interface ZohoContactResult {
  name: string;
  phone: string | null;
  email: string | null;
}

/** The first Contact linked to an Account — used to prefill Attention/Tel/email. */
export async function getZohoAccountPrimaryContact(accountId: string): Promise<ZohoContactResult | null> {
  const criteria = encodeURIComponent(`(Account_Name:equals:${accountId})`);
  const data = await zohoFetch(
    `/crm/v6/Contacts/search?criteria=${criteria}&fields=Full_Name,Phone,Mobile,Email&per_page=1`
  );
  const records = (data.data ?? []) as Array<{
    Full_Name: string;
    Phone: string | null;
    Mobile: string | null;
    Email: string | null;
  }>;
  const c = records[0];
  if (!c) return null;
  return { name: c.Full_Name, phone: c.Phone || c.Mobile, email: c.Email };
}
