-- Invoicing pipeline: a Sales Admin role that works a cross-department
-- "Pending Invoices" queue, two new statuses for that queue, and the
-- who/when stamp the "Done" action writes.
--
-- Hand-written (not `prisma migrate dev`) to keep the same shape the rest
-- of this project's migrations use and to seed the built-in Sales Admin
-- role in the same file, exactly like add_dynamic_roles seeded the other
-- six built-ins.

-- New enum values. On Postgres 12+ (Neon is 15+) ADD VALUE runs fine
-- inside Prisma's migration transaction as long as the value isn't *used*
-- in the same transaction — it isn't here.
ALTER TYPE "QuotationStatus" ADD VALUE 'PENDING_INVOICE';
ALTER TYPE "QuotationStatus" ADD VALUE 'INVOICED';

-- The Sales Admin permission bit. Defaults false, so every existing role
-- (the six built-ins included) keeps exactly the access it had.
ALTER TABLE "Role" ADD COLUMN "canInvoice" BOOLEAN NOT NULL DEFAULT false;

-- Who marked an LPO invoiced, and when. Nullable — only ever set by the
-- Sales Admin "Done" action, never at creation.
ALTER TABLE "Quotation" ADD COLUMN "invoicedById" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "invoicedAt" TIMESTAMP(3);

-- Optional relation → SET NULL on delete (Prisma's default for optional
-- relations), so removing a user account never blocks on their invoice
-- history or destroys the record — only the actor pointer is cleared.
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_invoicedById_fkey"
  FOREIGN KEY ("invoicedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the built-in Sales Admin role. isSystem = true so it can't be
-- deleted; canInvoice = true is its only capability — it deliberately
-- cannot create quotations, approve GP, or see margin anywhere.
INSERT INTO "Role"
  ("id", "name", "isSystem", "isAdmin", "canManageCatalog", "canManageUsers", "canCreateQuotations", "isSalesman", "canApproveGp", "gpMin", "gpMax", "canInvoice", "updatedAt")
VALUES
  ('role_sales_admin', 'Sales Admin', true, false, false, false, false, false, false, NULL, NULL, true, CURRENT_TIMESTAMP);
