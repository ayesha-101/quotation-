"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  if (state.success) {
    return (
      <div>
        <p className="success-note">
          If an account exists for that email, we&apos;ve sent a link to
          reset the password. It expires in 30 minutes.
        </p>
        <Link href="/login" className="btn" style={{ width: "100%", textAlign: "center", display: "block" }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state.error && <div className="error-note">{state.error}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
      </div>
      <button
        type="submit"
        className="btn primary"
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link
        href="/login"
        style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 16, color: "var(--ink-faint)" }}
      >
        Back to sign in
      </Link>
    </form>
  );
}
