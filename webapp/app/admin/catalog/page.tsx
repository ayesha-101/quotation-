import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import CatalogManager from "./catalog-manager";

export default async function AdminCatalogPage() {
  const admin = await requireAdmin();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const items = await prisma.catalogItem.findMany({
    orderBy: [{ brand: "asc" }, { code: "asc" }],
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
      <Link
        href="/"
        style={{ fontSize: 12, color: "var(--ink-faint)", display: "inline-block", marginBottom: 18 }}
      >
        ← Dashboard
      </Link>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Pricing catalog</h1>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ink-faint)",
          marginBottom: 28,
          lineHeight: 1.5,
        }}
      >
        Admin-only. This is the raw pricing data — list price, discounts,
        exchange rate, freight/duty/AD — that the quotation builder uses to
        compute landed cost and sell price per line.
      </p>

      <CatalogManager items={items} />
    </div>
  );
}
