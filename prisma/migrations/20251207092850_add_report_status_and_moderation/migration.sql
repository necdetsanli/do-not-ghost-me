-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'DELETED');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedReason" VARCHAR(255),
ADD COLUMN     "moderatedByAdminId" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderatedByAdminId_fkey" FOREIGN KEY ("moderatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
