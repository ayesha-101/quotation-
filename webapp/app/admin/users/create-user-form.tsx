"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, type CreateUserState } from "./actions";
import { ROLES, ROLE_LABELS, type RoleValue } from "@/lib/roles";

const initialState: CreateUserState = {};

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div>
      <form
        action={formAction}
        ref={formRef}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}
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
              Share this with them once — they&apos;ll be asked to set their
              own password at first sign-in.
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
          <label htmlFor="role">Role</label>
          <select id="role" name="role" required defaultValue="">
            <option value="" disabled>
              Choose role…
            </option>
            {ROLES.map((r: RoleValue) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Adding…" : "Add user"}
        </button>
      </form>
    </div>
  );
}
