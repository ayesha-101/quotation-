"use client";

import { useMemo, useState, useTransition } from "react";
import { verifyChainAction } from "./actions";

export interface ChainRecordData {
  seq: number;
  at: string;
  actor: string;
  action: string;
  resource: string;
  outcome: string;
  hash: string;
}

type VerifyState =
  | { status: "unchecked" }
  | { status: "checking" }
  | { status: "valid"; total: number }
  | { status: "broken"; brokenAt: number; total: number };

export default function ChainView({ records }: { records: ChainRecordData[] }) {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [verify, setVerify] = useState<VerifyState>({ status: "unchecked" });
  const [pending, startTransition] = useTransition();

  const actors = useMemo(() => Array.from(new Set(records.map((r) => r.actor))).sort(), [records]);

  const filtered = useMemo(
    () =>
      records
        .filter((r) => !actorFilter || r.actor === actorFilter)
        .filter((r) => !actionFilter || r.action.toLowerCase().includes(actionFilter.toLowerCase()))
        .slice()
        .reverse()
        .slice(0, 200),
    [records, actorFilter, actionFilter]
  );

  function handleVerify() {
    setVerify({ status: "checking" });
    startTransition(async () => {
      const res = await verifyChainAction();
      setVerify(
        res.valid
          ? { status: "valid", total: res.total }
          : { status: "broken", brokenAt: res.brokenAt as number, total: res.total }
      );
    });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ink-faint)", marginBottom: 8 }}>
            Chain records
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{records.length}</div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 6 }}>hash-linked, append-only</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ink-faint)", marginBottom: 8 }}>
            Chain integrity
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color:
                verify.status === "valid" ? "var(--green)" : verify.status === "broken" ? "var(--red)" : "var(--amber)",
            }}
          >
            {verify.status === "unchecked" && "—"}
            {verify.status === "checking" && "Checking…"}
            {verify.status === "valid" && "Valid"}
            {verify.status === "broken" && "BROKEN"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 6 }}>
            {verify.status === "unchecked" && "click Re-verify below"}
            {verify.status === "valid" && `re-hashed and matched, record 1 to ${verify.total}`}
            {verify.status === "broken" && `mismatch at seq ${verify.brokenAt}`}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14, lineHeight: 1.6 }}>
          Every significant action in the system — quotation created, LPO converted, GP approval
          decided, catalog/user/role changed — is appended here by the server (never the browser)
          with SHA-256 hashing that covers the record&apos;s own fields plus the previous record&apos;s
          hash. Editing, deleting, or reordering any entry breaks the chain from that point forward.
          Actor/action text is PII-masked (emails and 7+ digit numbers) before hashing.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn primary" onClick={handleVerify} disabled={pending}>
            {pending ? "Re-hashing every record…" : "Re-verify chain"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          placeholder="Filter action text…"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Seq</th>
              <th>At</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Outcome</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  No audit events yet.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.seq}>
                  <td className="mono">{r.seq}</td>
                  <td className="mono">{new Date(r.at).toLocaleString("en-AE")}</td>
                  <td style={{ color: "var(--brand)" }}>{r.actor}</td>
                  <td>{r.action}</td>
                  <td className="mono">{r.resource}</td>
                  <td>
                    <span className={`status-pill ${r.outcome === "success" ? "status-CONVERTED-TO-LPO" : "status-LOST"}`}>
                      {r.outcome}
                    </span>
                  </td>
                  <td className="mono" style={{ color: "var(--ink-faint)" }} title={r.hash}>
                    {r.hash.slice(0, 10)}…
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
