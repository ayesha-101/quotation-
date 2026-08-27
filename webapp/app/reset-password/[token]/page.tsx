import Link from "next/link";
import { prisma } from "@/lib/db";
import { hashResetToken } from "@/lib/reset-token";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  const valid = !!record && !record.usedAt && record.expiresAt > new Date();

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
        {valid ? (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 6 }}>Set new password</h1>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-faint)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Choose a new password for your account.
            </p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 6 }}>Link expired</h1>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-faint)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              This reset link is invalid or has already been used. Request a
              new one to continue.
            </p>
            <Link href="/forgot-password" className="btn primary" style={{ width: "100%", textAlign: "center", display: "block" }}>
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
