"use client";

import { useState, useTransition } from "react";
import { updateDepartmentAction } from "./actions";
import DepartmentFormFields, { type DepartmentDefaults } from "./department-form-fields";

export interface DepartmentData extends DepartmentDefaults {
  id: string;
  userCount: number;
  catalogCount: number;
  quotationCount: number;
}

export default function DepartmentRow({ department }: { department: DepartmentData }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateDepartmentAction(department.id, formData);
      if (res.error) setError(res.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <form action={handleSave} style={{ padding: "12px 0" }}>
            {error && <div className="error-note">{error}</div>}
            <DepartmentFormFields defaults={department} />
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
    <tr>
      <td style={{ color: "var(--ink)" }}>{department.name}</td>
      <td className="mono">{department.code}</td>
      <td className="mono">{department.quotePrefix}-YYYYMM-####</td>
      <td>
        <span className={`pill ${department.isActive ? "active" : "inactive"}`}>
          {department.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="mono">
        {department.userCount} users · {department.catalogCount} items · {department.quotationCount} quotes
      </td>
      <td>
        <button className="btn" disabled={pending} onClick={() => setEditing(true)}>
          Edit
        </button>
      </td>
    </tr>
  );
}
