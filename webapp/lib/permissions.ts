import { prisma } from "./db";

// Roles are rows in the database (see prisma/schema.prisma's Role model),
// not a fixed enum — an Admin can define new ones with their own
// permission flags and, if relevant, their own GP% approval range. Every
// permission check in the app goes through these helpers instead of
// comparing a role name string, so a custom role behaves identically to a
// built-in one everywhere.

export interface RolePermissions {
  isAdmin: boolean;
  canManageCatalog: boolean;
  canManageUsers: boolean;
  canCreateQuotations: boolean;
  isSalesman: boolean;
  canApproveGp: boolean;
}

export function canEditQuotes(role: RolePermissions): boolean {
  return role.isAdmin || role.canCreateQuotations;
}

export function canManageCatalog(role: RolePermissions): boolean {
  return role.isAdmin || role.canManageCatalog;
}

export function canManageUsers(role: RolePermissions): boolean {
  return role.isAdmin || role.canManageUsers;
}

// Finds which role's GP range covers a given margin (ranges are validated
// not to overlap when a role is created/edited — see admin/roles/actions).
// Returns null if no approver role currently covers this margin, which the
// caller must treat as "conversion can't be routed" rather than guessing.
export async function resolveApproverRoleId(gp: number): Promise<string | null> {
  const approverRoles = await prisma.role.findMany({ where: { canApproveGp: true } });
  const match = approverRoles.find(
    (r) => (r.gpMin === null || gp >= r.gpMin) && (r.gpMax === null || gp < r.gpMax)
  );
  return match?.id ?? null;
}
