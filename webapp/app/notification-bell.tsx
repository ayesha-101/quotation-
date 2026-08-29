"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface NotificationItem {
  id: string;
  href: string;
  label: string;
  detail: string;
}

export interface NotificationGroups {
  approvals: NotificationItem[];
  overdue: NotificationItem[];
  mismatches: NotificationItem[];
  totalCount: number;
}

// Pure display — every item is pre-fetched server-side in AppHeader from
// real data (pending approvals, overdue quotations, unresolved LPO
// mismatches). This component only owns open/close state.
export default function NotificationBell({ groups }: { groups: NotificationGroups }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const sections: Array<{ title: string; items: NotificationItem[] }> = [
    { title: "Awaiting your approval", items: groups.approvals },
    { title: "Overdue 7+ days", items: groups.overdue },
    { title: "LPO mismatches", items: groups.mismatches },
  ].filter((s) => s.items.length > 0);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "6px 10px", fontSize: 14, lineHeight: 1, position: "relative" }}
        title="Notifications"
      >
        🔔
        {groups.totalCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "var(--red)",
              color: "#fff",
              borderRadius: 999,
              fontSize: 9.5,
              minWidth: 15,
              height: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              fontWeight: 700,
            }}
          >
            {groups.totalCount > 9 ? "9+" : groups.totalCount}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 250,
            marginTop: 6,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--navy-panel)",
            border: "1px solid var(--grid-line)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {sections.length === 0 ? (
            <div style={{ padding: "16px", fontSize: 12.5, color: "var(--ink-faint)" }}>
              Nothing needs attention right now.
            </div>
          ) : (
            sections.map((s) => (
              <div key={s.title} style={{ padding: "10px 0" }}>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    color: "var(--ink-faint)",
                    padding: "0 14px 6px",
                  }}
                >
                  {s.title}
                </div>
                {s.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "7px 14px",
                      fontSize: 12.5,
                      color: "var(--ink)",
                      textDecoration: "none",
                    }}
                  >
                    <div className="mono">{item.label}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{item.detail}</div>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
