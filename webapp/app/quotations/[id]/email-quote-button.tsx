"use client";

import { useState, useTransition } from "react";
import { emailQuotationAction } from "../actions";
import { useToast } from "@/app/toast-provider";

export default function EmailQuoteButton({ quotationId, defaultTo }: { quotationId: string; defaultTo?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultTo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await emailQuotationAction(quotationId, email);
      if (res.error) {
        setError(res.error);
      } else {
        show(`Quotation emailed to ${email}.`, "success");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        Email to customer
      </button>
    );
  }

  return (
    <div className="field" style={{ maxWidth: 340 }}>
      <label>Customer email</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@customer.com"
          autoFocus
          style={{ flex: 1 }}
        />
        <button className="btn primary" disabled={pending} onClick={send}>
          {pending ? "Sending…" : "Send"}
        </button>
        <button
          className="btn"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
      {error && <div className="error-note" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
