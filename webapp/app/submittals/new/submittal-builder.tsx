"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSubmittalAction, type CustomFieldInput, type IndexItemInput } from "../actions";

const GENERAL_INDEX: string[] = [
  "COMPANY PROFILE",
  "TRADE LICENSE",
  "ISO CERTIFICATE",
  "AUTHORIZATION LETTER",
  "COMPLIANCE STATEMENT",
  "PROJECT SPECIFICATION",
  "COUNTRY OF ORIGIN",
  "TEST CERTIFICATES",
  "PREVIOUS PROJECTS",
  "PREVIOUS APPROVALS",
  "CATALOGUE",
];

function defaultRef(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `BMTC-SUB-${ym}-001`;
}

interface RemovableField {
  key: string;
  label: string;
  visible: boolean;
  value: string;
}

export default function SubmittalBuilder({ defaultSalesman }: { defaultSalesman: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [materialName, setMaterialName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [ref, setRef] = useState(defaultRef);
  const [projectName, setProjectName] = useState("");
  const [salesmanName, setSalesmanName] = useState(defaultSalesman);

  const [fields, setFields] = useState<RemovableField[]>([
    { key: "employerName", label: "Client", visible: true, value: "" },
    { key: "consultantName", label: "Consultant", visible: true, value: "" },
    { key: "mainContractor", label: "Main Contractor", visible: true, value: "" },
    { key: "mepContractor", label: "MEP Contractor", visible: true, value: "" },
  ]);
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([]);

  const [items, setItems] = useState<IndexItemInput[]>(
    GENERAL_INDEX.map((description) => ({ description, status: "" }))
  );
  const [quickAdd, setQuickAdd] = useState("");

  function updateField(key: string, value: string) {
    setFields((f) => f.map((x) => (x.key === key ? { ...x, value } : x)));
  }
  function toggleField(key: string) {
    setFields((f) => f.map((x) => (x.key === key ? { ...x, visible: !x.visible } : x)));
  }

  function incrementRef() {
    setRef((r) => r.replace(/-(\d+)$/, (_, n: string) => `-${String(+n + 1).padStart(n.length, "0")}`));
  }

  function addItem(description = "") {
    setItems((it) => [...it, { description, status: "" }]);
  }
  function removeItem(idx: number) {
    setItems((it) => it.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<IndexItemInput>) {
    setItems((it) => it.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
  function moveItem(idx: number, dir: -1 | 1) {
    setItems((it) => {
      const next = [...it];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return it;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function addFromQuickList() {
    const lines = quickAdd.split("\n").map((l) => l.trim()).filter(Boolean);
    setItems((it) => [...it, ...lines.map((description) => ({ description, status: "" as const }))]);
    setQuickAdd("");
  }

  function addCustomField() {
    setCustomFields((f) => [...f, { title: "", value: "" }]);
  }
  function updateCustomField(idx: number, patch: Partial<CustomFieldInput>) {
    setCustomFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
  function removeCustomField(idx: number) {
    setCustomFields((f) => f.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    setError(null);
    if (!materialName.trim() || !brandName.trim() || !ref.trim()) {
      setError("Material, Brand, and Ref. are required.");
      return;
    }
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("ref", ref);
    fd.set("materialName", materialName);
    fd.set("brandName", brandName);
    fd.set("projectName", projectName);
    fd.set("salesmanName", salesmanName);
    for (const f of fields) fd.set(f.key, f.visible ? f.value : "");
    fd.set("customFields", JSON.stringify(customFields.filter((c) => c.title && c.value)));
    fd.set("indexItems", JSON.stringify(items.filter((i) => i.description.trim())));

    startTransition(async () => {
      const res = await createSubmittalAction(fd);
      if (res.error) {
        setError(res.error);
      } else if (res.id) {
        router.push(`/submittals/${res.id}/print`);
      }
    });
  }

  return (
    <form ref={formRef}>
      {error && <div className="error-note">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 14 }}>Project &amp; cover details</h2>
        <div className="form-grid-3">
          <div className="field">
            <label>Material name</label>
            <input value={materialName} onChange={(e) => setMaterialName(e.target.value)} placeholder="e.g. G.I. Conduits & Accessories" />
          </div>
          <div className="field">
            <label>Brand / Manufacturer</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. BARTON" />
          </div>
          <div className="field">
            <label>Submittal Ref.</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={ref} onChange={(e) => setRef(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn" onClick={incrementRef} title="Increment number">
                +1
              </button>
            </div>
          </div>
          <div className="field">
            <label>Project</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Saad Tower, Abu Dhabi" />
          </div>
          <div className="field">
            <label>Salesman</label>
            <input value={salesmanName} onChange={(e) => setSalesmanName(e.target.value)} />
          </div>
          {fields
            .filter((f) => f.visible)
            .map((f) => (
              <div className="field" key={f.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>{f.label}</label>
                  <button
                    type="button"
                    onClick={() => toggleField(f.key)}
                    style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 12 }}
                    title="Remove field"
                  >
                    ✕
                  </button>
                </div>
                <input value={f.value} onChange={(e) => updateField(f.key, e.target.value)} />
              </div>
            ))}
        </div>

        {fields.some((f) => !f.visible) && (
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => setFields((f) => f.map((x) => ({ ...x, visible: true })))}>
            ↩ Restore removed fields
          </button>
        )}

        {customFields.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {customFields.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input placeholder="Field title" value={f.title} onChange={(e) => updateCustomField(i, { title: e.target.value })} style={{ flex: 1 }} />
                <input placeholder="Field value" value={f.value} onChange={(e) => updateCustomField(i, { value: e.target.value })} style={{ flex: 2 }} />
                <button type="button" className="btn" onClick={() => removeCustomField(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={addCustomField}>
          + Custom field
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 14 }}>Table of contents / index</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="mono" style={{ width: 24, fontSize: 12, color: "var(--ink-faint)" }}>
                {i + 1}.
              </span>
              <input
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Item description"
                style={{ flex: 1 }}
              />
              <select value={item.status} onChange={(e) => updateItem(i, { status: e.target.value as IndexItemInput["status"] })}>
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="na">N/A</option>
              </select>
              <button type="button" className="btn" onClick={() => moveItem(i, -1)} disabled={i === 0} title="Move up">
                ↑
              </button>
              <button type="button" className="btn" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} title="Move down">
                ↓
              </button>
              <button type="button" className="btn danger" onClick={() => removeItem(i)} title="Remove">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => addItem()} style={{ marginBottom: 14 }}>
          + Add item
        </button>

        <div className="field">
          <label>Quick add (one item per line)</label>
          <textarea
            rows={3}
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder={"Compliance Statement\nTest Certificates\nCatalogue Pages"}
          />
        </div>
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={addFromQuickList}>
          Add from list
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn primary" disabled={pending} onClick={handleSubmit}>
          {pending ? "Generating…" : "Generate submittal"}
        </button>
      </div>
    </form>
  );
}
