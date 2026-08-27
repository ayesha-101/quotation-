import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { ROLE_LABELS, type RoleValue } from "@/lib/roles";
import { logoutAction } from "@/app/logout/actions";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.8,
              color: "var(--brand)",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            BMTC
          </div>
          <h1 style={{ fontSize: 24 }}>Quotation &amp; LPO Control</h1>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 4 }}>
          Signed in as
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          {user.name}
        </div>
        <span className="pill active">
          {ROLE_LABELS[user.role as RoleValue]}
        </span>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, marginBottom: 6 }}>Quotations</h2>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-faint)",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {user.role === "ADMIN" || user.role === "QUOTATION_OFFICER"
            ? "Create quotations and track every one in the system."
            : "View every quotation in the system."}
        </p>
        <Link href="/quotations" className="btn primary">
          Quotation Tracker →
        </Link>
      </div>

      {user.role === "ADMIN" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>User access control</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Add, deactivate, or remove accounts, and reset passwords.
          </p>
          <Link href="/admin/users" className="btn primary">
            Manage users →
          </Link>
        </div>
      )}

      {user.role === "ADMIN" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 6 }}>Pricing catalog</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-faint)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Manage the catalog items and pricing inputs quotations are built
            from.
          </p>
          <Link href="/admin/catalog" className="btn primary">
            Manage catalog →
          </Link>
        </div>
      )}

      <div
        className="card"
        style={{ borderLeft: "3px solid var(--amber)" }}
      >
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>
          What&apos;s live here so far
        </h2>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-dim)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Real authentication, hashed passwords, session cookies, Admin-only
          user management, the pricing catalog, and quotation creation —
          all backed by a real Postgres database, with pricing recomputed
          server-side from the real catalog on every save. GP approval
          routing and LPO matching still live in the published Artifact;
          porting those is the next phase.
        </p>
      </div>
    </div>
  );
}
