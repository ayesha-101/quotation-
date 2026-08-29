import Link from "next/link";

export interface ActivityEntry {
  id: string;
  quotationId: string;
  ref: string;
  who: string;
  action: string;
  at: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// A cross-quotation feed of the same QuotationAuditEntry rows already shown
// per-quotation — just the newest across the whole (department-scoped)
// tracker, so "what happened recently" doesn't require opening each one.
export default function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 14, marginBottom: 12 }}>Recent activity</h2>
      <div className="audit-log">
        {entries.map((e) => (
          <div key={e.id} style={{ marginBottom: 6, fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-faint)" }} title={new Date(e.at).toLocaleString()}>
              {timeAgo(e.at)}
            </span>{" "}
            — <b>{e.who}</b>: {e.action} on{" "}
            <Link href={`/quotations/${e.quotationId}`} className="mono">
              {e.ref}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
