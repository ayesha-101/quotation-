"use client";

import { useState, useTransition } from "react";
import { createCatalogItemAction } from "./actions";
import CatalogItemRow, { type CatalogItemData } from "./catalog-item-row";

export default function CatalogManager({ items }: { items: CatalogItemData[] }) {
  const brands = Array.from(new Set(items.map((i) => i.brand))).sort();
  const [activeBrand, setActiveBrand] = useState<string | null>(brands[0] || null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const brand = activeBrand && brands.includes(activeBrand) ? activeBrand : brands[0] || null;
  const brandItems = brand ? items.filter((i) => i.brand === brand) : [];

  function addItem(targetBrand: string) {
    setError(null);
    const fd = new FormData();
    fd.set("code", "NEW-" + Date.now().toString().slice(-6));
    fd.set("description", "New item");
    fd.set("brand", targetBrand);
    fd.set("uom", "EACH");
    fd.set("currency", "USD");
    fd.set("exRate", "3.68");
    startTransition(async () => {
      const res = await createCatalogItemAction({}, fd);
      if (res.error) setError(res.error);
      else setActiveBrand(targetBrand);
    });
  }

  function addBrand() {
    const name = prompt("New brand name:");
    if (!name || !name.trim()) return;
    addItem(name.trim());
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {brands.map((b) => (
          <button
            key={b}
            className="btn"
            onClick={() => setActiveBrand(b)}
            disabled={pending}
            style={
              b === brand
                ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }
                : undefined
            }
          >
            {b} ({items.filter((i) => i.brand === b).length})
          </button>
        ))}
        <button className="btn" onClick={addBrand} disabled={pending}>
          + New brand
        </button>
      </div>

      {error && <div className="error-note" style={{ marginBottom: 14 }}>{error}</div>}

      {brand ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>
              {brand} — {brandItems.length} item{brandItems.length === 1 ? "" : "s"}
            </span>
            <button className="btn primary" onClick={() => addItem(brand)} disabled={pending}>
              + Add item to this brand
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>UOM</th>
                  <th>List Price</th>
                  <th>Ccy</th>
                  <th>Disc%</th>
                  <th>Ex.Rate</th>
                  <th>Freight%</th>
                  <th>Duty%</th>
                  <th>AD%</th>
                  <th>After Disc.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {brandItems.map((it) => (
                  <CatalogItemRow key={it.id} item={it} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>
          No brands yet — click &ldquo;+ New brand&rdquo; to add your first catalog item.
        </p>
      )}
    </div>
  );
}
