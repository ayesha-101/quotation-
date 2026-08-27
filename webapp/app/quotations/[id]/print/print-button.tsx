"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 18px",
        borderRadius: 6,
        border: "none",
        background: "#2e86de",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      🖨 Print / Save as PDF
    </button>
  );
}
