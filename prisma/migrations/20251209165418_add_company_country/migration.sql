/*
  Warnings:

  - You are about to drop the column `country` on the `Report` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[normalizedName,country]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `country` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Company_name_key";

-- DropIndex
DROP INDEX "Company_normalizedName_key";

-- DropIndex
DROP INDEX "idx_report_status_country_company";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "country" "CountryCode" NOT NULL;

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "country";

-- CreateIndex
CREATE UNIQUE INDEX "Company_normalizedName_country_key" ON "Company"("normalizedName", "country");

-- CreateIndex
CREATE INDEX "idx_report_status_company" ON "Report"("status", "companyId");
