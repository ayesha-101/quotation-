"use client";

import { useState, useTransition } from "react";
import {
  deleteUserAction,
  toggleActiveAction,
  resetPasswordAction,
} from "./actions";

export default function UserRowActions({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "error" | "temp-password";
    text: string;
  } | null>(null);

  function handleToggle() {
    setMessage(null);
    startTransition(async () => {
      const res = await toggleActiveAction(userId);
      if (res.error) setMessage({ kind: "error", text: res.error });
    });
  }

  function handleReset() {
    setMessage(null);
    startTransition(async () => {
      const res = await resetPasswordAction(userId);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else if (res.tempPassword)
        setMessage({
          kind: "temp-password",
          text: `New temporary password: ${res.tempPassword}`,
        });
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Delete this user permanently? This can't be undone — consider Deactivate instead if you might need them back."
      )
    )
      return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.error) setMessage({ kind: "error", text: res.error });
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          className="btn"
          onClick={handleToggle}
          disabled={pending || isSelf}
          title={isSelf ? "You can't deactivate your own account" : undefined}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <button className="btn" onClick={handleReset} disabled={pending}>
          Reset password
        </button>
        <button
          className="btn danger"
          onClick={handleDelete}
          disabled={pending || isSelf}
          title={isSelf ? "You can't delete your own account" : undefined}
        >
          Delete
        </button>
      </div>
      {message && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11.5,
            padding: "6px 10px",
            borderRadius: 6,
            fontFamily: message.kind === "temp-password" ? "monospace" : undefined,
            color: message.kind === "error" ? "var(--red)" : "var(--green)",
            background:
              message.kind === "error" ? "var(--red-bg)" : "var(--green-bg)",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
