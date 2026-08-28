"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

export default function CreateUserForm({
  roles,
  departments,
  homeDepartmentName,
}: {
  roles: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  homeDepartmentName: string;
}) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const showDepartmentSelect = departments.length > 0;

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div>
      <form
        action={formAction}
        ref={formRef}
        style={{
          display: "grid",
          gridTemplateColumns: showDepartmentSelect ? "1fr 1fr 1fr 1fr auto" : "1fr 1fr 1fr auto",
          gap: 12,
          alignItems: "end",
        }}
      >
        {state.error && (
          <div className="error-note" style={{ gridColumn: "1 / -1" }}>
            {state.error}
          </div>
        )}
        {state.success && state.tempPassword && (
          <div
            className="success-note"
            style={{ gridColumn: "1 / -1", fontFamily: "monospace" }}
          >
            Created {state.email} — temporary password:{" "}
            <b>{state.tempPassword}</b>
            <br />
            <span style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              {state.emailSent
                ? "A welcome email with these details was sent to them."
                : "Couldn't send the welcome email — share this with them once yourself."}{" "}
              They&apos;ll be asked to set their own password at first
              sign-in.
            </span>
          </div>
        )}
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" required />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="roleId">Role</label>
          <select id="roleId" name="roleId" required defaultValue="">
            <option value="" disabled>
              Choose role…
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {showDepartmentSelect ? (
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="departmentId">Department</label>
            <select id="departmentId" name="departmentId" required defaultValue="">
              <option value="" disabled>
                Choose department…
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field" style={{ margin: 0 }}>
            <label>Department</label>
            <input value={homeDepartmentName} disabled />
          </div>
        )}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Adding…" : "Add user"}
        </button>
      </form>
    </div>
  );
}
