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

// Data-quality gate: when on, a quotation can only be created for a
// customer actually picked from the CRM search (crmAccountId set) — no more
// free-typed "asdf" in the To field. Off by default so it never blocks
// quotation creation while the CRM connection itself is still being set up;
// flip ZOHO_REQUIRE_CRM_CUSTOMER=true in Vercel once Zoho search is
// confirmed working end-to-end.
export function requireCrmCustomer(): boolean {
  return process.env.ZOHO_REQUIRE_CRM_CUSTOMER?.trim() === "true";
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
    signal: AbortSignal.timeout(8000),
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
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho API ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

/** Link to a Deal in the Zoho CRM web UI, for "view in CRM" links. */
export function zohoDealUrl(dealId: string): string {
  const orgId = process.env.ZOHO_ORG_ID?.trim() || "885191803";
  const uiDomain = process.env.ZOHO_CRM_UI_DOMAIN?.trim() || "https://crm.zoho.com";
  return `${uiDomain}/crm/org${orgId}/tab/Potentials/${dealId}`;
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

/**
 * Create a Deal for a newly created quotation, linked to its Account when
 * we have one (the customer was picked from the CRM autocomplete). Returns
 * the new Deal's id, or null if Zoho didn't hand one back.
 */
export async function createZohoDeal(input: {
  dealName: string;
  accountId?: string;
  amount: number;
}): Promise<string | null> {
  const closingDate = new Date();
  closingDate.setDate(closingDate.getDate() + 30);
  const data = await zohoFetch("/crm/v6/Deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          Deal_Name: input.dealName,
          Stage: "Qualification",
          Amount: input.amount,
          Closing_Date: closingDate.toISOString().slice(0, 10),
          ...(input.accountId ? { Account_Name: { id: input.accountId } } : {}),
        },
      ],
    }),
  });
  return data.data?.[0]?.details?.id ?? null;
}

/** An open follow-up Task attached to a Deal — reminds the salesman to chase it. */
export async function createZohoTask(input: { subject: string; dealId: string }): Promise<void> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  await zohoFetch("/crm/v6/Tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          Subject: input.subject,
          Status: "Not Started",
          Due_Date: dueDate.toISOString().slice(0, 10),
          What_Id: input.dealId,
          $se_module: "Deals",
        },
      ],
    }),
  });
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
