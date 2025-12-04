-- CreateTable
CREATE TABLE "ReportIpCompanyLimit" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "positionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportIpCompanyLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportIpCompanyLimit_ipHash_companyId_idx" ON "ReportIpCompanyLimit"("ipHash", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportIpCompanyLimit_ipHash_companyId_positionKey_key" ON "ReportIpCompanyLimit"("ipHash", "companyId", "positionKey");
