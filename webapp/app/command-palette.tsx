"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ROUTES = [
  { label: "Dashboard", href: "/", keywords: "home overview stats" },
  { label: "Quotations", href: "/quotations", keywords: "list tracker all quotes" },
  { label: "New quotation", href: "/quotations/new", keywords: "create add new quote" },
  { label: "Materials & catalog", href: "/materials", keywords: "catalog items products brands" },
  { label: "Approvals", href: "/approvals", keywords: "pending approve gp queue" },
  { label: "Manage users", href: "/admin/users", keywords: "admin team accounts people" },
  { label: "Catalog management", href: "/admin/catalog", keywords: "admin brands import master" },
  { label: "Departments", href: "/admin/departments", keywords: "admin teams sections" },
  { label: "Roles", href: "/admin/roles", keywords: "admin permissions" },
  { label: "Security log", href: "/security", keywords: "audit chain admin" },
  { label: "Zoho CRM setup", href: "/admin/zoho-setup", keywords: "admin api integration crm" },
];

// Global Cmd/Ctrl+K quick-nav — a static route list is enough for now
// (route guards on the server still gate anything a user shouldn't reach).
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = ROUTES.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.label.toLowerCase().includes(q) || r.keywords.includes(q);
  });

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 32, 0.5)",
        zIndex: 400,
        display: "flex",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card corner-marks"
        style={{ width: "100%", maxWidth: 480, maxHeight: "70vh", padding: 0, overflow: "hidden" }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[activeIndex]) go(filtered[activeIndex].href);
            }
          }}
          placeholder="Jump to…"
          style={{
            width: "100%",
            border: "none",
            borderBottom: "1px solid var(--grid-line)",
            padding: "14px 18px",
            fontSize: 14,
            outline: "none",
            borderRadius: 0,
          }}
        />
        <div style={{ maxHeight: 300, overflowY: "auto", padding: "6px 0" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--ink-faint)" }}>No matches.</div>
          )}
          {filtered.map((r, i) => (
            <button
              key={r.href}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => go(r.href)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 18px",
                fontSize: 13,
                border: "none",
                background: i === activeIndex ? "var(--brand-dim)" : "none",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div
          style={{
            padding: "8px 18px",
            borderTop: "1px solid var(--grid-line)",
            fontSize: 10.5,
            color: "var(--ink-faint)",
          }}
        >
          ↑↓ navigate · Enter select · Esc close
        </div>
      </div>
    </div>
  );
}
