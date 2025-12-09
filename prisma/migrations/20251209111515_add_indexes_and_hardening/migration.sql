/*
  Warnings:

  - You are about to alter the column `password` on the `AdminUser` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ipHash` on the `ReportIpCompanyLimit` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `positionKey` on the `ReportIpCompanyLimit` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(160)`.
  - You are about to alter the column `ipHash` on the `ReportIpDailyLimit` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `day` on the `ReportIpDailyLimit` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "password" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "ReportIpCompanyLimit" ALTER COLUMN "ipHash" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "positionKey" SET DATA TYPE VARCHAR(160);

-- AlterTable
ALTER TABLE "ReportIpDailyLimit" ALTER COLUMN "ipHash" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "day" SET DATA TYPE VARCHAR(10);

-- CreateIndex
CREATE INDEX "idx_company_created_at" ON "Company"("createdAt");

-- CreateIndex
CREATE INDEX "idx_report_company_id" ON "Report"("companyId");

-- CreateIndex
CREATE INDEX "idx_report_status_flagged_at" ON "Report"("status", "flaggedAt");

-- CreateIndex
CREATE INDEX "idx_day" ON "ReportIpDailyLimit"("day");

-- RenameIndex
ALTER INDEX "ReportIpCompanyLimit_ipHash_companyId_idx" RENAME TO "idx_ip_company";
