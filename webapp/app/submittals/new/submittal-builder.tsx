"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSubmittalAction, extractSubmittalPdfTextAction, type CustomFieldInput, type IndexItemInput } from "../actions";
import { useToast } from "@/app/toast-provider";

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

// Free, rule-based field extraction — not AI. Client project-details
// tables almost always read as "LABEL value" (same line, or the label
// alone on a row from a 2-column table), using a small, predictable
// vocabulary of labels — so a curated list of exact labels gets real
// value here without a paid model call, and safely: matching a *known*
// label first avoids the classic regex trap of a generic "SHORT-LABEL
// long value" pattern silently mis-splitting a real two-word label like
// "SUB CONTRACTOR" into "SUB" + "CONTRACTOR ...". Labels not in this list
// fall straight through to the index quick-add box untouched — never
// guessed at.
interface ParsedFields {
  fields: { projectName?: string; employerName?: string; consultantName?: string; mainContractor?: string; mepContractor?: string };
  customFields: CustomFieldInput[];
  remaining: string[];
}

type LabelMatch = { field: keyof ParsedFields["fields"] } | { customTitle: string };

// Longer/more specific labels first, so e.g. "SUB CONTRACTOR" is tried
// before a hypothetical bare "CONTRACTOR" fallback would ever get a shot.
const KNOWN_LABELS: Array<{ re: RegExp; match: LabelMatch }> = [
  { re: /^sub\s*-?\s*contractor\b\s*[:\-]?\s*(.*)$/i, match: { customTitle: "Sub Contractor" } },
  { re: /^mep\s*contractor\b\s*[:\-]?\s*(.*)$/i, match: { field: "mepContractor" } },
  { re: /^main\s*contractor\b\s*[:\-]?\s*(.*)$/i, match: { field: "mainContractor" } },
  { re: /^contractor\b\s*[:\-]?\s*(.*)$/i, match: { field: "mainContractor" } },
  { re: /^(?:client|employer)\b\s*[:\-]?\s*(.*)$/i, match: { field: "employerName" } },
  { re: /^consultant\b\s*[:\-]?\s*(.*)$/i, match: { field: "consultantName" } },
  { re: /^project\s*location\b\s*[:\-]?\s*(.*)$/i, match: { customTitle: "Project Location" } },
  { re: /^project\s*(?:ref\.?|reference|no\.?|number)\b\s*[:\-]?\s*(.*)$/i, match: { customTitle: "Project Ref." } },
  { re: /^project\b\s*(?:name)?\s*[:\-]?\s*(.*)$/i, match: { field: "projectName" } },
  { re: /^(?:tender|contract)\s*(?:ref\.?|no\.?|number)\b\s*[:\-]?\s*(.*)$/i, match: { customTitle: "Tender / Contract No." } },
  { re: /^p\.?\s*o\.?\s*(?:no\.?|number)\b\s*[:\-]?\s*(.*)$/i, match: { customTitle: "PO No." } },
];

function parseProjectFields(lines: string[]): ParsedFields {
  const fields: ParsedFields["fields"] = {};
  const customFields: CustomFieldInput[] = [];
  const remaining: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^project\s*details$/i.test(line)) continue; // table header, not data

    const known = KNOWN_LABELS.find(({ re }) => re.test(line));
    if (!known) {
      remaining.push(line);
      continue;
    }

    // Value is whatever follows the label on the same line; if the row was
    // just the bare label (2-column table read as separate lines), take
    // the next line as the value instead, provided it isn't itself a label.
    let value = line.match(known.re)?.[1]?.trim() ?? "";
    if (!value && i + 1 < lines.length && !KNOWN_LABELS.some(({ re }) => re.test(lines[i + 1]))) {
      value = lines[++i];
    }
    if (!value) continue;

    if ("field" in known.match) {
      if (!fields[known.match.field]) fields[known.match.field] = value;
    } else {
      customFields.push({ title: known.match.customTitle, value });
    }
  }

  return { fields, customFields, remaining };
}

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
  const { show } = useToast();
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

  const [indexType, setIndexType] = useState<"general" | "custom">("general");
  const [items, setItems] = useState<IndexItemInput[]>(
    GENERAL_INDEX.map((description) => ({ description, status: "" }))
  );
  const [quickAdd, setQuickAdd] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectIndexType(type: "general" | "custom") {
    setIndexType(type);
    setItems(type === "general" ? GENERAL_INDEX.map((description) => ({ description, status: "" })) : []);
  }

  // Free, non-AI extraction only — see extractSubmittalPdfTextAction. This
  // dumps raw recognized text into the quick-add box for the user to
  // review and clean up themselves; it never guesses which line is which
  // field (that needs real language understanding, i.e. a paid AI call,
  // which this project has deliberately opted out of twice now).
  async function importFromFile(file: File) {
    setImportError(null);
    setImporting(true);
    try {
      let text: string;
      if (file.type === "application/pdf") {
        const fd = new FormData();
        fd.set("file", file);
        const res = await extractSubmittalPdfTextAction(fd);
        if (res.error || !res.text) throw new Error(res.error || "No text found in that PDF.");
        text = res.text;
      } else if (file.type.startsWith("image/")) {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        try {
          const {
            data: { text: ocrText },
          } = await worker.recognize(file);
          text = ocrText;
        } finally {
          await worker.terminate();
        }
      } else {
        throw new Error("Choose a PDF or an image file.");
      }
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^--\s*\d+\s*of\s*\d+\s*--$/i.test(l)); // strip pdf-parse's page-separator lines

      const { fields: matched, customFields: matchedCustom, remaining } = parseProjectFields(lines);
      const filledLabels: string[] = [];
      if (matched.projectName) {
        setProjectName(matched.projectName);
        filledLabels.push("Project");
      }
      if (matched.employerName) {
        updateField("employerName", matched.employerName);
        filledLabels.push("Client");
      }
      if (matched.consultantName) {
        updateField("consultantName", matched.consultantName);
        filledLabels.push("Consultant");
      }
      if (matched.mainContractor) {
        updateField("mainContractor", matched.mainContractor);
        filledLabels.push("Main Contractor");
      }
      if (matched.mepContractor) {
        updateField("mepContractor", matched.mepContractor);
        filledLabels.push("MEP Contractor");
      }
      if (matchedCustom.length > 0) {
        setCustomFields((f) => [...f, ...matchedCustom]);
        filledLabels.push(...matchedCustom.map((c) => c.title));
      }
      if (filledLabels.length > 0) {
        show(`Auto-filled from file: ${filledLabels.join(", ")}. Please double-check them.`, "success");
      }
      if (remaining.length > 0) {
        setQuickAdd((prev) => (prev ? prev + "\n" : "") + remaining.join("\n"));
      } else if (filledLabels.length === 0) {
        show("No recognizable text found in that file.", "error");
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateField(key: string, value: string) {
    // Also forces visible: true — a caller setting a value (e.g. the file
    // import) means it should actually be shown, not silently dropped at
    // submit because it had earlier been toggled off.
    setFields((f) => f.map((x) => (x.key === key ? { ...x, value, visible: true } : x)));
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

        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "9px 16px",
              border: `1.5px solid ${indexType === "general" ? "var(--brand)" : "var(--grid-line)"}`,
              borderRadius: 8,
              color: indexType === "general" ? "var(--brand)" : "var(--ink)",
              background: indexType === "general" ? "var(--brand-dim)" : "transparent",
            }}
          >
            <input type="radio" checked={indexType === "general"} onChange={() => selectIndexType("general")} style={{ width: "auto" }} />
            General (standard 11)
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "9px 16px",
              border: `1.5px solid ${indexType === "custom" ? "var(--brand)" : "var(--grid-line)"}`,
              borderRadius: 8,
              color: indexType === "custom" ? "var(--brand)" : "var(--ink)",
              background: indexType === "custom" ? "var(--brand-dim)" : "transparent",
            }}
          >
            <input type="radio" checked={indexType === "custom"} onChange={() => selectIndexType("custom")} style={{ width: "auto" }} />
            Custom (from client)
          </label>
        </div>

        {indexType === "custom" && (
          <div className="frame-box" style={{ marginBottom: 18, padding: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Import from a client file (optional)</div>
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 10, lineHeight: 1.5 }}>
              Upload the client&apos;s index as a PDF or a photo — the raw text gets dropped into the quick-add
              box below for you to review and clean up. No AI involved, so it won&apos;t sort lines into the
              right fields on its own.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFromFile(f);
                }}
                disabled={importing}
              />
              {importing && <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Reading file…</span>}
            </div>
            {importError && <div className="error-note" style={{ marginTop: 10 }}>{importError}</div>}
          </div>
        )}

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
