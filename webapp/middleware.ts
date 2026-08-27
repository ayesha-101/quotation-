import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

// Fast-path check only: verifies the session JWT's signature and expiry.
// It does NOT touch the database, so it cannot see a deleted/deactivated
// user — that authoritative check happens in lib/auth-guard.ts on every
// server component and action. Never rely on middleware as the only auth
// layer (a matcher change can silently stop covering a route).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* is no longer gated here on a single isAdmin flag: since roles
  // are dynamic (see lib/permissions.ts), /admin/catalog and /admin/users
  // are reachable by roles with just canManageCatalog/canManageUsers, not
  // only full Admins. Each of those routes re-checks its own specific
  // permission via requireCatalogManager()/requireUserManager()/
  // requireAdmin() — this middleware only handles "not logged in at all".

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
