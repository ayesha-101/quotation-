import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

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

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) redirect("/login");

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
