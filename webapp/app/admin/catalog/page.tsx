import { redirect } from "next/navigation";
import { requireCatalogManager } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { departmentScope } from "@/lib/permissions";
import AppHeader from "@/app/app-header";
import CatalogManager from "./catalog-manager";

export default async function AdminCatalogPage() {
  const admin = await requireCatalogManager();
  if (admin.mustResetPassword) redirect("/account/reset-password");

  const items = await prisma.catalogItem.findMany({
    where: departmentScope(admin),
    orderBy: [{ brand: "asc" }, { code: "asc" }],
  });

  return (
    <>
      <AppHeader user={admin} active="catalog" />
      <div className="page-wrap">
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Pricing catalog</h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          Requires catalog access. This is the raw pricing data — list price, discounts,
          exchange rate, freight/duty/AD — that the quotation builder uses to
          compute landed cost and sell price per line.
        </p>

        <CatalogManager items={items} />
      </div>
    </>
  );
}
