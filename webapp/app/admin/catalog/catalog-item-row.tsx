"use client";

import { useState, useTransition } from "react";
import { updateCatalogItemAction, deleteCatalogItemAction } from "./actions";

export interface CatalogItemData {
  id: string;
  code: string;
  brand: string;
  description: string;
  uom: string;
  exWork: string;
  currency: string;
  listPrice: number;
  disPct: number;
  exRate: number;
  freightPct: number;
  dutyPct: number;
  adPct: number;
}

type Fields = Pick<
  CatalogItemData,
  | "description"
  | "uom"
  | "exWork"
  | "currency"
  | "listPrice"
  | "disPct"
  | "exRate"
  | "freightPct"
  | "dutyPct"
  | "adPct"
>;

export default function CatalogItemRow({ item }: { item: CatalogItemData }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Fields>({
    description: item.description,
    uom: item.uom,
    exWork: item.exWork,
    currency: item.currency,
    listPrice: item.listPrice,
    disPct: item.disPct,
    exRate: item.exRate,
    freightPct: item.freightPct,
    dutyPct: item.dutyPct,
    adPct: item.adPct,
  });

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError(null);
    const formData = new FormData();
    Object.entries(f).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      const res = await updateCatalogItemAction(item.id, formData);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${item.code} from the catalog? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCatalogItemAction(item.id);
      if (res.error) setError(res.error);
    });
  }

  const afterDiscount = f.listPrice * (1 - (f.disPct || 0) / 100);
  const inputStyle = { width: "100%", fontSize: 12 };

  return (
    <>
      <tr>
        <td className="mono">{item.code}</td>
        <td>
          <input
            style={{ ...inputStyle, minWidth: 160 }}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </td>
        <td>
          <input style={{ ...inputStyle, width: 60 }} value={f.uom} onChange={(e) => set("uom", e.target.value)} />
        </td>
        <td>
          <input
            className="mono"
            style={{ ...inputStyle, width: 80 }}
            type="number"
            step="0.01"
            value={f.listPrice}
            onChange={(e) => set("listPrice", parseFloat(e.target.value) || 0)}
          />
        </td>
        <td>
          <input style={{ ...inputStyle, width: 50 }} value={f.currency} onChange={(e) => set("currency", e.target.value)} />
        </td>
        <td>
          <input
            className="mono"
            style={{ ...inputStyle, width: 60 }}
            type="number"
            step="0.01"
            value={f.disPct}
            onChange={(e) => set("disPct", parseFloat(e.target.value) || 0)}
          />
        </td>
        <td>
          <input
            className="mono"
            style={{ ...inputStyle, width: 60 }}
            type="number"
            step="0.01"
            value={f.exRate}
            onChange={(e) => set("exRate", parseFloat(e.target.value) || 0)}
          />
        </td>
        <td>
          <input
            className="mono"
            style={{ ...inputStyle, width: 60 }}
            type="number"
            step="0.01"
            value={f.freightPct}
            onChange={(e) => set("freightPct", parseFloat(e.target.value) || 0)}
          />
        </td>
        <td>
          <input
            className="mono"
            style={{ ...inputStyle, width: 60 }}
            type="number"
            step="0.01"
            value={f.dutyPct}
            onChange={(e) => set("dutyPct", parseFloat(e.target.value) || 0)}
          />
        </td>
        <td>
          <input
            className="mono"
            style={{ ...inputStyle, width: 55 }}
            type="number"
            step="0.01"
            value={f.adPct}
            onChange={(e) => set("adPct", parseFloat(e.target.value) || 0)}
          />
        </td>
        <td className="mono">{afterDiscount.toFixed(2)}</td>
        <td>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" onClick={handleSave} disabled={pending}>
              Save
            </button>
            <button className="btn danger" onClick={handleDelete} disabled={pending}>
              Delete
            </button>
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={12}>
            <div className="error-note" style={{ margin: "4px 0" }}>
              {error}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
