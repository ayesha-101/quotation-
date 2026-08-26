"use client";

import { useActionState } from "react";
import { resetOwnPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetOwnPasswordAction,
    initialState
  );

  return (
    <form action={formAction}>
      {state.error && <div className="error-note">{state.error}</div>}
      <div className="field">
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm new password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button
        type="submit"
        className="btn primary"
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
