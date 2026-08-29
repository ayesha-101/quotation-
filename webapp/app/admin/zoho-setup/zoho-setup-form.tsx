"use client";

import { useActionState } from "react";
import { exchangeZohoGrantCodeAction, type ExchangeResult } from "./actions";

const initialState: ExchangeResult = {};

export default function ZohoSetupForm() {
  const [state, formAction, pending] = useActionState(exchangeZohoGrantCodeAction, initialState);

  return (
    <div>
      <form action={formAction}>
        {state.error && <div className="error-note">{state.error}</div>}
        <div className="field">
          <label>Client ID</label>
          <input name="clientId" className="mono" required />
        </div>
        <div className="field">
          <label>Client Secret</label>
          <input name="clientSecret" className="mono" type="password" required />
        </div>
        <div className="field">
          <label>Grant Token</label>
          <input name="code" className="mono" placeholder="1000...." required />
        </div>
        <input type="hidden" name="accountsDomain" value="https://accounts.zoho.com" />
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Exchanging…" : "Exchange for refresh token"}
        </button>
      </form>

      {state.refreshToken && (
        <div className="success-note" style={{ marginTop: 16 }}>
          <b>Done — copy these into Vercel&apos;s Environment Variables now</b> (Settings → Environment
          Variables on the project), then redeploy:
          <div className="mono" style={{ marginTop: 10, wordBreak: "break-all" }}>
            <div style={{ marginBottom: 6 }}>
              <b>ZOHO_REFRESH_TOKEN</b>
              <br />
              {state.refreshToken}
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            Also set <span className="mono">ZOHO_CLIENT_ID</span> and{" "}
            <span className="mono">ZOHO_CLIENT_SECRET</span> to the same values you just typed above.
            This refresh token doesn&apos;t expire on its own — you won&apos;t need to redo this unless
            it&apos;s revoked in Zoho.
          </span>
        </div>
      )}
    </div>
  );
}
