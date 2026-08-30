"use client";

import { useState, useTransition } from "react";
import { deleteSubmittalAction, updateSubmittalTrackingAction } from "./actions";
import { useToast } from "@/app/toast-provider";

const STATUS_OPTIONS = [
  "Pending Submission",
  "Submitted",
  "Approved",
  "Approved with Comments",
  "Rejected",
  "Resubmitted",
];

const BADGE_COLOR: Record<string, string> = {
  Approved: "var(--green)",
  "Approved with Comments": "var(--green)",
  Rejected: "var(--red)",
  Submitted: "var(--brand)",
  Resubmitted: "var(--brand)",
  "Pending Submission": "var(--amber)",
};

export default function TrackerRow({
  id,
  status,
  remark,
  value,
  canEdit,
}: {
  id: string;
  status: string;
  remark: string;
  value: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { show } = useToast();
  const [localStatus, setLocalStatus] = useState(status);
  const [localRemark, setLocalRemark] = useState(remark);
  const [localValue, setLocalValue] = useState(value);

  function save(fields: { status?: string; remark?: string; value?: string }) {
    startTransition(async () => {
      const res = await updateSubmittalTrackingAction(id, fields);
      if (res.error) show(res.error, "error");
    });
  }

  function del() {
    if (!confirm("Delete this submittal record?")) return;
    startTransition(async () => {
      const res = await deleteSubmittalAction(id);
      if (res.error) show(res.error, "error");
    });
  }

  if (!canEdit) {
    return (
      <>
        <td>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: BADGE_COLOR[status] || "var(--ink-faint)" }}>{status}</span>
        </td>
        <td>{remark || "—"}</td>
        <td className="mono">{value || "—"}</td>
        <td />
      </>
    );
  }

  return (
    <>
      <td>
        <select
          value={localStatus}
          disabled={pending}
          onChange={(e) => {
            setLocalStatus(e.target.value);
            save({ status: e.target.value });
          }}
          style={{ fontSize: 12, padding: "4px 6px" }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          value={localRemark}
          disabled={pending}
          onChange={(e) => setLocalRemark(e.target.value)}
          onBlur={() => save({ remark: localRemark })}
          placeholder="Add remark…"
          style={{ fontSize: 12, padding: "4px 6px" }}
        />
      </td>
      <td>
        <input
          className="mono"
          value={localValue}
          disabled={pending}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => save({ value: localValue })}
          style={{ fontSize: 12, padding: "4px 6px", width: 90 }}
        />
      </td>
      <td>
        <button className="remove-line" disabled={pending} onClick={del} title="Delete">
          ✕
        </button>
      </td>
    </>
  );
}
