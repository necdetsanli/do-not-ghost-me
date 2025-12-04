-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('CV_SCREEN', 'FIRST_INTERVIEW', 'TECHNICAL', 'HR_INTERVIEW', 'OFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'OTHER');

-- CreateEnum
CREATE TYPE "PositionCategory" AS ENUM ('SOFTWARE_ENGINEERING', 'DEVOPS_SRE_PLATFORM', 'SECURITY', 'DATA_ML_AI', 'MOBILE', 'EMBEDDED_ROBOTICS', 'QA_TEST', 'CLOUD_INFRA', 'PRODUCT', 'DESIGN', 'OTHER');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "jobLevel" "JobLevel" NOT NULL,
    "positionCategory" "PositionCategory" NOT NULL,
    "positionDetail" VARCHAR(80) NOT NULL,
    "daysWithoutReply" INTEGER NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
