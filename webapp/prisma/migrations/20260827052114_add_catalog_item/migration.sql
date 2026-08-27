-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "exWork" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "listPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exRate" DOUBLE PRECISION NOT NULL DEFAULT 3.68,
    "freightPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dutyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_code_brand_key" ON "CatalogItem"("code", "brand");
