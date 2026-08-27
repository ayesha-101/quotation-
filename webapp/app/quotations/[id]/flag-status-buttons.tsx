"use client";

import { useState, useTransition } from "react";
import { flagStatusAction } from "../actions";

export default function FlagStatusButtons({ quotationId }: { quotationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function flag(status: "UNDER_NEGOTIATION" | "LOST") {
    setError(null);
    startTransition(async () => {
      const res = await flagStatusAction(quotationId, status);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" disabled={pending} onClick={() => flag("UNDER_NEGOTIATION")}>
          Flag Under Negotiation
        </button>
        <button className="btn danger" disabled={pending} onClick={() => flag("LOST")}>
          Flag Lost
        </button>
      </div>
      {error && <div className="error-note" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
