"use client";

import { useState, useTransition } from "react";
import { updateRoleAction, deleteRoleAction } from "./actions";
import RoleFormFields, { type RoleDefaults } from "./role-form-fields";

export interface RoleData extends RoleDefaults {
  id: string;
  isSystem: boolean;
  userCount: number;
}

function permissionBadges(r: RoleData): string[] {
  const badges: string[] = [];
  if (r.isAdmin) badges.push("Full Admin");
  if (r.canManageCatalog) badges.push("Manage catalog");
  if (r.canManageUsers) badges.push("Manage users");
  if (r.canCreateQuotations) badges.push("Create quotations");
  if (r.isSalesman) badges.push("Salesman");
  if (r.canInvoice) badges.push("Sales Admin");
  if (r.canApproveGp) badges.push(`Approve GP ${r.gpMin ?? "−∞"}–${r.gpMax ?? "∞"}%`);
  return badges;
}

export default function RoleRow({ role }: { role: RoleData }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateRoleAction(role.id, formData);
      if (res.error) setError(res.error);
      else setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete role "${role.name}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteRoleAction(role.id);
      if (res.error) setError(res.error);
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={4}>
          <form action={handleSave} style={{ padding: "12px 0" }}>
            {error && <div className="error-note">{error}</div>}
            <RoleFormFields defaults={role} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn primary" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn" disabled={pending} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td style={{ color: "var(--ink)" }}>
          {role.name}
          {role.isSystem && <span style={{ color: "var(--ink-faint)" }}> (built-in)</span>}
        </td>
        <td style={{ maxWidth: 380 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {permissionBadges(role).map((b) => (
              <span key={b} className="pill active" style={{ fontSize: 9.5 }}>
                {b}
              </span>
            ))}
          </div>
        </td>
        <td className="mono">{role.userCount}</td>
        <td>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" disabled={pending} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              className="btn danger"
              disabled={pending || role.isSystem || role.userCount > 0}
              title={
                role.isSystem
                  ? "Built-in roles can't be deleted"
                  : role.userCount > 0
                    ? "Reassign users off this role first"
                    : undefined
              }
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={4}>
            <div className="error-note" style={{ margin: "4px 0" }}>
              {error}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
