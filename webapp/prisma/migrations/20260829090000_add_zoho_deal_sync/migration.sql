-- Zoho CRM push-sync: nullable, additive columns — no backfill needed.
ALTER TABLE "Quotation" ADD COLUMN "crmAccountId" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "zohoDealId" TEXT;
