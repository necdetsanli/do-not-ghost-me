/*
  Warnings:

  - You are about to alter the column `daysWithoutReply` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.

*/
-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "daysWithoutReply" DROP NOT NULL,
ALTER COLUMN "daysWithoutReply" SET DATA TYPE SMALLINT;
