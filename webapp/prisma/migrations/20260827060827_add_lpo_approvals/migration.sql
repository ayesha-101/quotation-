-- CreateEnum
CREATE TYPE "ApprovalTier" AS ENUM ('LINE_MANAGER', 'GM', 'CEO');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "customerLpoNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lpoMismatch" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuotationLine" ADD COLUMN     "custPrice" DOUBLE PRECISION,
ADD COLUMN     "custQty" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "tier" "ApprovalTier" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "comment" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
