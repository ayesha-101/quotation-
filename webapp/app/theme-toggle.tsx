"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bmtc-theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Deliberately not a lazy useState initializer: server-rendered HTML has
  // no access to the DOM's data-theme attribute, so the first client render
  // must also start from `false` to match it (avoiding a hydration
  // mismatch) — this effect corrects it right after, same tick the
  // beforeInteractive script already applied the attribute.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private mode etc) — theme just won't persist
    }
  }

  return (
    <button
      type="button"
      className="btn"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ padding: "6px 10px", fontSize: 14, lineHeight: 1 }}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
