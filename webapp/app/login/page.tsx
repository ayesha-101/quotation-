import LoginForm from "./login-form";
import LoginHero from "./login-hero";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;

  return (
    <div className="login-shell">
      <LoginHero />

      <div className="login-form-panel">
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div
              className="brand-wordmark"
              style={{
                fontSize: 13,
                letterSpacing: 2,
                color: "var(--brand)",
                marginBottom: 10,
              }}
            >
              BMTC <span style={{ color: "var(--ink)" }}>Estimation Control</span>
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
            {reset === "1" && (
              <div className="success-note">
                Password updated. Sign in with your new password.
              </div>
            )}
            <LoginForm next={next || "/"} />
          </div>

          <div className="frame-box corner-marks">
            <div className="brand-wordmark" style={{ fontSize: 11, color: "var(--ink)", marginBottom: 6 }}>
              Need an account?
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5, margin: 0, maxWidth: 260 }}>
              Accounts are created by an Admin from Manage users. First sign-in forces a password
              change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
