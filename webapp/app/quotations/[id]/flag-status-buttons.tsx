"use client";

import { useState, useTransition } from "react";
import { flagStatusAction } from "../actions";

export default function FlagStatusButtons({ quotationId }: { quotationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState("");

  function flagUnderNegotiation() {
    setError(null);
    startTransition(async () => {
      const res = await flagStatusAction(quotationId, "UNDER_NEGOTIATION");
      if (res.error) setError(res.error);
    });
  }

  function submitLost() {
    if (!lostReason.trim()) {
      setError("Give a reason for marking this quotation as lost.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await flagStatusAction(quotationId, "LOST", lostReason.trim());
      if (res.error) setError(res.error);
    });
  }

  if (showLostForm) {
    return (
      <div className="field" style={{ maxWidth: 420 }}>
        <label>Reason for marking Lost</label>
        <textarea
          rows={2}
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          placeholder="e.g. Customer awarded to another supplier on price"
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn danger" disabled={pending} onClick={submitLost}>
            {pending ? "Saving…" : "Confirm Lost"}
          </button>
          <button
            className="btn"
            disabled={pending}
            onClick={() => {
              setShowLostForm(false);
              setLostReason("");
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

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" disabled={pending} onClick={flagUnderNegotiation}>
          Flag Under Negotiation
        </button>
        <button className="btn danger" disabled={pending} onClick={() => setShowLostForm(true)}>
          Flag Lost
        </button>
      </div>
      {error && <div className="error-note" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
