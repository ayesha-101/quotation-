-- Nullable, additive column — no backfill needed.
ALTER TABLE "Quotation" ADD COLUMN "lostReason" TEXT;
