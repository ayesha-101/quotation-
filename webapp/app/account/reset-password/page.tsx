import { requireUser } from "@/lib/auth-guard";
import ResetPasswordForm from "./reset-form";

export default async function ResetPasswordPage() {
  const user = await requireUser();

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
        <h1 style={{ fontSize: 20, marginBottom: 6 }}>Set your password</h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Hi {user.name} — this account was created with a temporary
          password. Choose a new one before continuing.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
