import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canManageCatalog, canManageUsers } from "@/lib/permissions";

/**
 * The proxy (proxy.ts) only checks that a session cookie is present and
 * valid — it never touches the database, so a deleted or deactivated user
 * could still hold a live JWT until it expires. Every server component and
 * server action must call this instead of trusting proxy alone, so a
 * deleted/deactivated account loses access on its very next request.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { role: true, department: true },
  });
  if (!user || !user.isActive) redirect("/login");

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.role.isAdmin) redirect("/");
  return user;
}

export async function requireCatalogManager() {
  const user = await requireUser();
  if (!canManageCatalog(user.role)) redirect("/");
  return user;
}

export async function requireUserManager() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/");
  return user;
}
