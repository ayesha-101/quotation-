-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "customerLpoFileData" BYTEA,
ADD COLUMN     "customerLpoFileName" TEXT,
ADD COLUMN     "customerLpoFileText" TEXT;
