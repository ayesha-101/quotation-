"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { createQuotationAction } from "../actions";
import {
  computeLinePricing,
  round2,
  DEFAULT_MARGIN_PCT,
  defaultPricingControls,
  type PricingControls,
} from "@/lib/pricing";
import CrmAccountField, { type CrmAccountSelection } from "./crm-account-field";

interface CatalogItemData {
  code: string;
  description: string;
  brand: string;
  uom: string;
  listPrice: number;
  disPct: number;
  exRate: number;
  freightPct: number;
  dutyPct: number;
  adPct: number;
}

interface SalesmanOption {
  id: string;
  name: string;
}

interface LineState {
  code: string;
  description: string;
  brand: string;
  uom: string;
  qty: number;
  speDiscPct: number;
  marginPct: number;
  unitLanded: number;
  unitSell: number;
  lineTotal: number;
  manual: boolean;
}

function blankLine(): LineState {
  return {
    code: "",
    description: "",
    brand: "",
    uom: "",
    qty: 1,
    speDiscPct: 0,
    marginPct: DEFAULT_MARGIN_PCT,
    unitLanded: 0,
    unitSell: 0,
    lineTotal: 0,
    manual: true,
  };
}

function findCatalogItem(catalog: CatalogItemData[], code: string) {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  return catalog.find((it) => it.code.toUpperCase() === c);
}

function fmtMoney(n: number): string {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface HeaderGroup {
  label: string;
  fields: Array<[string, string]>;
}

const HEADER_GROUPS: HeaderGroup[] = [
  {
    label: "Customer & project",
    fields: [
      ["to", "To (customer / company)"],
      ["attention", "Attention"],
      ["client", "Client"],
      ["consultant", "Consultant"],
      ["project", "Project"],
      ["reference", "Reference"],
      ["subject", "Subject"],
    ],
  },
  {
    label: "Contact",
    fields: [
      ["telNo", "Tel no."],
      ["faxNo", "Fax no."],
      ["mobNo", "Mobile no."],
    ],
  },
  {
    label: "Terms & delivery",
    fields: [
      ["delivery", "Delivery"],
      ["deliveryPlace", "Delivery place"],
      ["validity", "Validity"],
      ["paymentTerms", "Payment terms"],
    ],
  },
  {
    label: "Prepared by",
    fields: [
      ["prepName", "Name"],
      ["prepTitle", "Title"],
      ["prepMobile", "Mobile"],
    ],
  },
];

export default function QuotationBuilder({
  catalog,
  salesmen,
}: {
  catalog: CatalogItemData[];
  salesmen: SalesmanOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const attentionRef = useRef<HTMLInputElement>(null);
  const telNoRef = useRef<HTMLInputElement>(null);
  const [crmAccountId, setCrmAccountId] = useState("");
  const [lines, setLines] = useState<LineState[]>([blankLine()]);
  const [ctl, setCtl] = useState<PricingControls>(defaultPricingControls());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function recalcLine(line: LineState, currentCtl: PricingControls): LineState {
    const cat = findCatalogItem(catalog, line.code);
    if (cat) {
      const p = computeLinePricing(cat, {
        speDiscPct: line.speDiscPct,
        marginPct: line.marginPct,
        ctl: currentCtl,
      });
      const next = {
        ...line,
        description: cat.description,
        brand: cat.brand,
        uom: cat.uom,
        manual: false,
        unitLanded: p.landedUnit,
        unitSell: p.sellUnit,
      };
      next.lineTotal = round2((next.qty || 0) * (next.unitSell || 0));
      return next;
    }
    const next = { ...line, manual: true };
    next.lineTotal = round2((next.qty || 0) * (next.unitSell || 0));
    return next;
  }

  function updateLine(idx: number, patch: Partial<LineState>) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = recalcLine({ ...next[idx], ...patch }, ctl);
      return next;
    });
  }

  function updateCtl(patch: Partial<PricingControls>) {
    const nextCtl = { ...ctl, ...patch };
    setCtl(nextCtl);
    setLines((prev) => prev.map((l) => recalcLine(l, nextCtl)));
  }

  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const totals = useMemo(() => {
    const quoteValue = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const vat = round2(quoteValue * 0.05);
    const totalValue = round2(quoteValue + vat);
    const landedTotal = lines.reduce((s, l) => s + l.unitLanded * l.qty, 0);
    const gp = quoteValue ? ((quoteValue - landedTotal) / quoteValue) * 100 : 0;
    return { quoteValue, vat, totalValue, gp };
  }, [lines]);

  function handleSubmit(status: "DRAFT" | "QUOTED") {
    setError(null);
    if (!formRef.current) return;
    const salesmanId = String(new FormData(formRef.current).get("salesmanId") || "");
    if (!salesmanId) {
      setError("Choose a salesman.");
      return;
    }
    if (lines.every((l) => !l.code && !l.description)) {
      setError("Add at least one line item.");
      return;
    }

    const fd = new FormData(formRef.current);
    fd.set("status", status);
    fd.set("lines", JSON.stringify(lines));
    fd.set("pricingControls", JSON.stringify(ctl));
    fd.set("crmAccountId", crmAccountId);

    startTransition(async () => {
      const res = await createQuotationAction(fd);
      if (res?.error) setError(res.error);
    });
  }

  function handleCrmAccountSelect(account: CrmAccountSelection) {
    setCrmAccountId(account.id);
    if (attentionRef.current && account.contactName) {
      attentionRef.current.value = account.contactName;
    }
    if (telNoRef.current && account.contactPhone) {
      telNoRef.current.value = account.contactPhone;
    }
  }

  return (
    <form ref={formRef}>
      {error && <div className="error-note">{error}</div>}

      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 26px 4px" }}>
          <h2 style={{ fontSize: 14, marginBottom: 4 }}>Header</h2>
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 18 }}>
            Fields that appear on the printed quotation.
          </p>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Salesman</label>
            <select name="salesmanId" defaultValue="" required>
              <option value="" disabled>
                Choose salesman…
              </option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {HEADER_GROUPS.map((group) => (
          <div key={group.label} className="form-section">
            <div className="form-section-label">{group.label}</div>
            <div className="form-grid-3">
              {group.fields.map(([name, label]) => (
                <div className="field" key={name}>
                  <label>{label}</label>
                  {name === "to" ? (
                    <CrmAccountField
                      onSelectAccount={handleCrmAccountSelect}
                      onTextChange={() => setCrmAccountId("")}
                    />
                  ) : name === "attention" ? (
                    <input name={name} ref={attentionRef} />
                  ) : name === "telNo" ? (
                    <input name={name} ref={telNoRef} />
                  ) : (
                    <input name={name} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 14 }}>Pricing controls (global)</h2>
        <div className="form-grid-3">
          <div className="field">
            <label>Special discount % (global)</label>
            <input
              type="number"
              step="0.01"
              value={ctl.speDiscGlobalPct}
              onChange={(e) => updateCtl({ speDiscGlobalPct: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label>Ex. GBP</label>
            <input
              type="number"
              step="0.01"
              value={ctl.exGbp}
              onChange={(e) => updateCtl({ exGbp: parseFloat(e.target.value) || 1 })}
            />
          </div>
          <div className="field">
            <label>Freight % (global)</label>
            <input
              type="number"
              step="0.01"
              value={ctl.freightGlobalPct}
              onChange={(e) => updateCtl({ freightGlobalPct: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label>Duty % (global)</label>
            <input
              type="number"
              step="0.01"
              value={ctl.dutyGlobalPct}
              onChange={(e) => updateCtl({ dutyGlobalPct: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="field">
            <label>Margin % (global)</label>
            <input
              type="number"
              step="0.01"
              value={ctl.marginGlobalPct}
              onChange={(e) => updateCtl({ marginGlobalPct: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>Line items</h2>
          <button type="button" className="btn" onClick={addLine}>
            + Add line
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Description</th>
                <th>Brand</th>
                <th>UOM</th>
                <th>Qty</th>
                <th>Spe.Disc%</th>
                <th>Margin%</th>
                <th>Unit sell</th>
                <th>Line total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const cat = findCatalogItem(catalog, l.code);
                const notFound = !!l.code && !cat;
                return (
                  <tr key={idx}>
                    <td className="mono">{idx + 1}</td>
                    <td>
                      <input
                        className="mono"
                        style={{ minWidth: 110 }}
                        list="catalog-codes"
                        value={l.code}
                        placeholder="Cat. Ref."
                        onChange={(e) => updateLine(idx, { code: e.target.value })}
                      />
                      {notFound && <div className="li-badge">code not in catalog — manual line</div>}
                    </td>
                    <td>
                      <input
                        style={{ minWidth: 160 }}
                        value={l.description}
                        readOnly={!!cat}
                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: 90 }}
                        value={l.brand}
                        readOnly={!!cat}
                        onChange={(e) => updateLine(idx, { brand: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: 70 }}
                        value={l.uom}
                        readOnly={!!cat}
                        onChange={(e) => updateLine(idx, { uom: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="mono"
                        style={{ width: 70 }}
                        type="number"
                        min={0}
                        value={l.qty}
                        onChange={(e) => updateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        className="mono"
                        style={{ width: 70 }}
                        type="number"
                        step="0.01"
                        value={l.speDiscPct}
                        onChange={(e) => updateLine(idx, { speDiscPct: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        className="mono"
                        style={{ width: 70 }}
                        type="number"
                        step="0.01"
                        value={l.marginPct}
                        onChange={(e) => updateLine(idx, { marginPct: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        className="mono"
                        style={{ width: 90 }}
                        type="number"
                        step="0.01"
                        value={l.unitSell}
                        readOnly={!!cat}
                        onChange={(e) => updateLine(idx, { unitSell: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="mono" style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      {fmtMoney(l.lineTotal)}
                    </td>
                    <td>
                      <button type="button" className="remove-line" onClick={() => removeLine(idx)}>
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="catalog-codes">
          {catalog.map((c) => (
            <option key={c.code + c.brand} value={c.code}>
              {c.code} — {c.description} ({c.brand})
            </option>
          ))}
        </datalist>

        <div className="totals-box">
          <div className="line">
            <span>Quote value</span>
            <span className="mono">{fmtMoney(totals.quoteValue)}</span>
          </div>
          <div className="line">
            <span>VAT (5%)</span>
            <span className="mono">{fmtMoney(totals.vat)}</span>
          </div>
          <div className="line total">
            <span>Total</span>
            <span className="mono">{fmtMoney(totals.totalValue)}</span>
          </div>
          <div
            className="line"
            style={{ marginTop: 8, borderTop: "1px dashed var(--grid-line)", paddingTop: 8 }}
          >
            <span>Internal margin (approval routing)</span>
            <span className="mono">{totals.gp.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn" disabled={pending} onClick={() => handleSubmit("DRAFT")}>
          {pending ? "Saving…" : "Save as Draft"}
        </button>
        <button type="button" className="btn primary" disabled={pending} onClick={() => handleSubmit("QUOTED")}>
          {pending ? "Saving…" : "Save & Send (Quoted)"}
        </button>
      </div>
    </form>
  );
}
