import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import AppHeader from "@/app/app-header";
import ZohoSetupForm from "./zoho-setup-form";

export default async function ZohoSetupPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  return (
    <>
      <AppHeader user={admin} active="departments" />
      <div className="page-wrap" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Zoho CRM — one-time setup</h1>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
          Admin-only. Paste the Client ID, Client Secret, and a freshly generated Grant Token from
          Zoho API Console (Self Client → Generate) to get a permanent Refresh Token. Nothing here
          is stored — you copy the result into Vercel yourself.
        </p>

        <div className="card">
          <ZohoSetupForm />
        </div>
      </div>
    </>
  );
}
