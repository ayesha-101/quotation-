-- Replace the fixed Role/ApprovalTier enums with a real Role table, so an
-- Admin can define new roles (custom permissions, and optionally a GP%
-- range that plugs into approval routing) without a code change.
--
-- Written by hand (not `prisma migrate dev`) because Postgres won't let a
-- table share a name with an existing enum type — the old "Role" enum must
-- be dropped before the new "Role" table can be created — and because the
-- existing role/tier values must be preserved, not dropped and renulled.

-- Step 1: add the new FK columns as plain nullable text first (no Role
-- table exists yet, so no FK constraint yet either).
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;
ALTER TABLE "Approval" ADD COLUMN "roleId" TEXT;

-- Step 2: backfill from the old enum values onto fixed ids for the six
-- built-in roles (the same ids the seed rows below will use).
UPDATE "User" SET "roleId" = CASE "role"
  WHEN 'ADMIN' THEN 'role_admin'
  WHEN 'QUOTATION_OFFICER' THEN 'role_quotation_officer'
  WHEN 'SALESMAN' THEN 'role_salesman'
  WHEN 'LINE_MANAGER' THEN 'role_line_manager'
  WHEN 'GM' THEN 'role_gm'
  WHEN 'CEO' THEN 'role_ceo'
END;

UPDATE "Approval" SET "roleId" = CASE "tier"
  WHEN 'LINE_MANAGER' THEN 'role_line_manager'
  WHEN 'GM' THEN 'role_gm'
  WHEN 'CEO' THEN 'role_ceo'
END;

-- Step 3: drop the old enum-typed columns and the enums themselves — this
-- frees up the name "Role" for the new table.
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "Approval" DROP COLUMN "tier";
DROP TYPE "Role";
DROP TYPE "ApprovalTier";

-- Step 4: create the new Role table.
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "canManageCatalog" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canCreateQuotations" BOOLEAN NOT NULL DEFAULT false,
    "isSalesman" BOOLEAN NOT NULL DEFAULT false,
    "canApproveGp" BOOLEAN NOT NULL DEFAULT false,
    "gpMin" DOUBLE PRECISION,
    "gpMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- Step 5: seed the six built-in roles, using the same ids the backfill
-- above already wrote onto User.roleId / Approval.roleId. GP ranges
-- reproduce the original fixed thresholds exactly (>=10% Line Manager,
-- 5-10% GM, <5% CEO).
INSERT INTO "Role"
  ("id", "name", "isSystem", "isAdmin", "canManageCatalog", "canManageUsers", "canCreateQuotations", "isSalesman", "canApproveGp", "gpMin", "gpMax", "updatedAt")
VALUES
  ('role_admin', 'Admin', true, true, true, true, true, false, false, NULL, NULL, CURRENT_TIMESTAMP),
  ('role_quotation_officer', 'Quotation Officer', true, false, false, false, true, false, false, NULL, NULL, CURRENT_TIMESTAMP),
  ('role_salesman', 'Salesman', true, false, false, false, false, true, false, NULL, NULL, CURRENT_TIMESTAMP),
  ('role_line_manager', 'Line Manager', true, false, false, false, false, false, true, 10, NULL, CURRENT_TIMESTAMP),
  ('role_gm', 'GM', true, false, false, false, false, false, true, 5, 10, CURRENT_TIMESTAMP),
  ('role_ceo', 'CEO', true, false, false, false, false, false, true, NULL, 5, CURRENT_TIMESTAMP);

-- Step 6: now that every row has a valid roleId, make it required and add
-- the real foreign keys.
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "Approval" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
