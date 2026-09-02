"use client";

import { useState } from "react";

export interface RoleDefaults {
  name: string;
  isAdmin: boolean;
  canManageCatalog: boolean;
  canManageUsers: boolean;
  canCreateQuotations: boolean;
  isSalesman: boolean;
  canApproveGp: boolean;
  canInvoice: boolean;
  gpMin: number | null;
  gpMax: number | null;
}

const CHECKBOXES: Array<{ name: keyof RoleDefaults; label: string; hint: string }> = [
  { name: "isAdmin", label: "Full Admin", hint: "Everything — including managing roles" },
  { name: "canManageCatalog", label: "Manage catalog", hint: "Add/edit/delete pricing catalog items" },
  { name: "canManageUsers", label: "Manage users", hint: "Add/deactivate/delete accounts" },
  { name: "canCreateQuotations", label: "Create quotations", hint: "Build and convert quotations to LPO" },
  { name: "isSalesman", label: "Salesman", hint: "Appears in the quotation builder's salesman list" },
  { name: "canInvoice", label: "Sales Admin (invoicing)", hint: "Works the cross-department Pending Invoices queue" },
];

export default function RoleFormFields({ defaults }: { defaults: RoleDefaults }) {
  const [canApproveGp, setCanApproveGp] = useState(defaults.canApproveGp);

  return (
    <>
      <div className="field">
        <label>Role name</label>
        <input name="name" defaultValue={defaults.name} required placeholder="e.g. Regional Manager" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {CHECKBOXES.map((cb) => (
          <label key={cb.name} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
            <input
              type="checkbox"
              name={cb.name}
              defaultChecked={defaults[cb.name] as boolean}
              style={{ width: "auto", marginTop: 2 }}
            />
            <span>
              <div style={{ color: "var(--ink)" }}>{cb.label}</div>
              <div style={{ color: "var(--ink-faint)", fontSize: 10.5 }}>{cb.hint}</div>
            </span>
          </label>
        ))}
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
          <input
            type="checkbox"
            name="canApproveGp"
            defaultChecked={defaults.canApproveGp}
            onChange={(e) => setCanApproveGp(e.target.checked)}
            style={{ width: "auto", marginTop: 2 }}
          />
          <span>
            <div style={{ color: "var(--ink)" }}>Approve GP</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 10.5 }}>
              Decides GP approvals in the margin range below
            </div>
          </span>
        </label>
      </div>

      {canApproveGp && (
        <div className="form-grid" style={{ maxWidth: 360 }}>
          <div className="field">
            <label>GP% minimum (blank = no lower bound)</label>
            <input name="gpMin" type="number" step="0.1" defaultValue={defaults.gpMin ?? ""} />
          </div>
          <div className="field">
            <label>GP% maximum (blank = no upper bound)</label>
            <input name="gpMax" type="number" step="0.1" defaultValue={defaults.gpMax ?? ""} />
          </div>
        </div>
      )}
    </>
  );
}
