import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import QuotationBuilder from "./quotation-builder";

export default async function NewQuotationPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");
  if (!canEditQuotes(user.role)) {
    redirect("/quotations");
  }

  const [catalog, salesmen] = await Promise.all([
    prisma.catalogItem.findMany({ orderBy: [{ brand: "asc" }, { code: "asc" }] }),
    prisma.user.findMany({
      where: { role: { isSalesman: true }, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/quotations"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Quotation Tracker
      </Link>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>New quotation</h1>
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 28, lineHeight: 1.5 }}>
        Pricing recalculates live as you type, from the same engine as the
        catalog — but the numbers actually saved are recomputed on the
        server from the real catalog, never trusted from the browser.
      </p>

      {salesmen.length === 0 ? (
        <div className="error-note">
          No active Salesman accounts exist yet. Ask an Admin to add one
          under Manage users before creating a quotation.
        </div>
      ) : (
        <QuotationBuilder catalog={catalog} salesmen={salesmen} />
      )}
    </div>
  );
}
