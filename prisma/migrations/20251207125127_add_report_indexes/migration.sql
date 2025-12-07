-- CreateIndex
CREATE INDEX "idx_report_status_country_company" ON "Report"("status", "country", "companyId");

-- CreateIndex
CREATE INDEX "idx_report_created_at" ON "Report"("createdAt");
