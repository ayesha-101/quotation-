import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
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
        <h1 style={{ fontSize: 20, marginBottom: 6 }}>Forgot password</h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Enter your account email and we&apos;ll send you a link to reset
          your password.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
