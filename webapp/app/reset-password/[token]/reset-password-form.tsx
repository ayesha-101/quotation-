"use client";

import { useActionState } from "react";
import { resetPasswordViaTokenAction, type ResetViaTokenState } from "./actions";

const initialState: ResetViaTokenState = {};

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordViaTokenAction,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
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
          autoFocus
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
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
