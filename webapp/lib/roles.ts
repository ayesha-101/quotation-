export const ROLES = [
  "ADMIN",
  "QUOTATION_OFFICER",
  "SALESMAN",
  "LINE_MANAGER",
  "GM",
  "CEO",
] as const;

export type RoleValue = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleValue, string> = {
  ADMIN: "Admin",
  QUOTATION_OFFICER: "Quotation Officer",
  SALESMAN: "Salesman",
  LINE_MANAGER: "Line Manager",
  GM: "GM",
  CEO: "CEO",
};
