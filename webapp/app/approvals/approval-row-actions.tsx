"use client";

import { useState, useTransition } from "react";
import { decideApprovalAction } from "./actions";

export default function ApprovalRowActions({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "APPROVED" | "REJECTED", commentText: string) {
    setError(null);
    startTransition(async () => {
      const res = await decideApprovalAction(approvalId, decision, commentText);
      if (res.error) setError(res.error);
      else setRejecting(false);
    });
  }

  if (rejecting) {
    return (
      <div style={{ minWidth: 220 }}>
        <textarea
          rows={3}
          placeholder="Reason for rejection…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ marginBottom: 6 }}
        />
        {error && <div className="error-note" style={{ marginBottom: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn danger" disabled={pending} onClick={() => decide("REJECTED", comment)}>
            Confirm reject
          </button>
          <button className="btn" disabled={pending} onClick={() => setRejecting(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" disabled={pending} onClick={() => decide("APPROVED", "")}>
          Approve
        </button>
        <button className="btn danger" disabled={pending} onClick={() => setRejecting(true)}>
          Reject
        </button>
      </div>
      {error && <div className="error-note" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}
