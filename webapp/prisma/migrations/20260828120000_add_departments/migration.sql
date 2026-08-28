-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quotePrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- Seed the one department that exists today. Its id is a fixed string (not
-- a random cuid) so this migration's later UPDATE ... SET "departmentId" =
-- 'dept_electrical' statements can reference it directly.
INSERT INTO "Department" ("id", "name", "code", "quotePrefix", "isActive", "updatedAt")
VALUES ('dept_electrical', 'Electrical', 'ELE', 'BMTC-JIH', true, CURRENT_TIMESTAMP);

-- Add departmentId nullable first, backfill every existing row onto
-- Electrical, then tighten to NOT NULL + FK — the same three-step shape
-- used for the Role migration, needed because Postgres won't let a NOT
-- NULL column exist before its values are populated.
ALTER TABLE "User" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "departmentId" TEXT;

UPDATE "User" SET "departmentId" = 'dept_electrical';
UPDATE "CatalogItem" SET "departmentId" = 'dept_electrical';
UPDATE "Quotation" SET "departmentId" = 'dept_electrical';

ALTER TABLE "User" ALTER COLUMN "departmentId" SET NOT NULL;
ALTER TABLE "CatalogItem" ALTER COLUMN "departmentId" SET NOT NULL;
ALTER TABLE "Quotation" ALTER COLUMN "departmentId" SET NOT NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CatalogItem codes are now unique per department, not globally — two
-- departments can each have their own "ABC123" without colliding.
DROP INDEX "CatalogItem_code_brand_key";
CREATE UNIQUE INDEX "CatalogItem_departmentId_code_brand_key" ON "CatalogItem"("departmentId", "code", "brand");

-- QuoteSequence becomes one row per department (keyed on departmentId)
-- instead of a single global singleton row (id = 1).
ALTER TABLE "QuoteSequence" ADD COLUMN "departmentId" TEXT;
UPDATE "QuoteSequence" SET "departmentId" = 'dept_electrical' WHERE "id" = 1;
ALTER TABLE "QuoteSequence" DROP CONSTRAINT "QuoteSequence_pkey";
ALTER TABLE "QuoteSequence" DROP COLUMN "id";
ALTER TABLE "QuoteSequence" ALTER COLUMN "departmentId" SET NOT NULL;
ALTER TABLE "QuoteSequence" ADD CONSTRAINT "QuoteSequence_pkey" PRIMARY KEY ("departmentId");
ALTER TABLE "QuoteSequence" ADD CONSTRAINT "QuoteSequence_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
