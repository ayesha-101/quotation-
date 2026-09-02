"use client";

import { useState, useTransition } from "react";
import { markInvoicedAction } from "./actions";

export default function InvoiceRowActions({ quotationId }: { quotationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function markDone() {
    setError(null);
    startTransition(async () => {
      const res = await markInvoicedAction(quotationId);
      if (res.error) {
        setError(res.error);
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn primary" disabled={pending} onClick={markDone}>
            {pending ? "Saving…" : "Confirm invoiced"}
          </button>
          <button className="btn" disabled={pending} onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
        {error && <div className="error-note" style={{ margin: 0 }}>{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <button className="btn" disabled={pending} onClick={() => setConfirming(true)}>
        Done ✓
      </button>
      {error && (
        <div className="error-note" style={{ marginTop: 6, maxWidth: 220 }}>
          {error}
        </div>
      )}
    </div>
  );
}
