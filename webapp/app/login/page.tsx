import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.8,
            color: "var(--brand)",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          BMTC
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 6 }}>Sign in</h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Quotation &amp; LPO Control — internal access only.
        </p>
        <LoginForm next={next || "/"} />
      </div>
    </div>
  );
}
