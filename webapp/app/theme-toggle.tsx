"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bmtc-theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
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
