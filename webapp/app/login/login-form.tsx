"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
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
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <button
        type="submit"
        className="btn primary corner-marks"
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Link
        href="/forgot-password"
        style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 16, color: "var(--ink-faint)" }}
      >
        Forgot your password?
      </Link>
    </form>
  );
}
