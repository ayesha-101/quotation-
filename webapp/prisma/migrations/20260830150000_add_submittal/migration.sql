-- CreateTable
CREATE TABLE "Submittal" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "employerName" TEXT NOT NULL DEFAULT '',
    "consultantName" TEXT NOT NULL DEFAULT '',
    "mainContractor" TEXT NOT NULL DEFAULT '',
    "mepContractor" TEXT NOT NULL DEFAULT '',
    "customFields" JSONB NOT NULL DEFAULT '[]',
    "indexItems" JSONB NOT NULL DEFAULT '[]',
    "value" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Pending Submission',
    "remark" TEXT NOT NULL DEFAULT '',
    "salesmanName" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submittal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submittal_departmentId_ref_key" ON "Submittal"("departmentId", "ref");

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
