"use client";

import { useEffect, useRef, useState } from "react";

interface AccountResult {
  id: string;
  name: string;
  phone: string | null;
}

export interface CrmAccountSelection {
  id: string;
  name: string;
  phone: string | null;
  contactName?: string;
  contactPhone?: string | null;
}

// Search-as-you-type against Zoho CRM's Accounts module. Typing freely still
// works — this only ever fills the field, it never blocks a name that isn't
// in the CRM. Picking a result also fetches that account's first linked
// Contact so the caller can prefill Attention/Tel No. from it.
export default function CrmAccountField({
  defaultValue,
  onSelectAccount,
  onTextChange,
}: {
  defaultValue?: string;
  onSelectAccount: (account: CrmAccountSelection) => void;
  onTextChange?: () => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [results, setResults] = useState<AccountResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setError(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/zoho/accounts?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.accounts ?? []);
        setError(data.error ?? null);
      } catch (e) {
        setResults([]);
        setError(e instanceof Error ? e.message : "CRM lookup failed.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function pick(account: AccountResult) {
    setValue(account.name);
    setOpen(false);
    setResults([]);
    let contactName: string | undefined;
    let contactPhone: string | null | undefined = account.phone;
    try {
      const res = await fetch(`/api/zoho/accounts/${account.id}/contact`);
      const data = await res.json();
      if (data.contact) {
        contactName = data.contact.name;
        contactPhone = data.contact.phone ?? account.phone;
      }
    } catch {
      // fall back to just the account's own phone
    }
    onSelectAccount({ id: account.id, name: account.name, phone: account.phone, contactName, contactPhone });
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        name="to"
        value={value}
        autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          onTextChange?.();
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search CRM or type freely…"
      />
      {open && (loading || results.length > 0 || error) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "var(--navy-panel)",
            border: "1px solid var(--grid-line)",
            borderRadius: "var(--radius)",
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {loading && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--ink-faint)" }}>
              Searching CRM…
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--red)" }}>{error}</div>
          )}
          {!loading &&
            !error &&
            results.map((a) => (
              <button
                key={a.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(a)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 12.5,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink)",
                }}
              >
                {a.name}
                {a.phone && <span style={{ color: "var(--ink-faint)" }}> — {a.phone}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
