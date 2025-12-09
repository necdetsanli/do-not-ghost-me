// src/app/admin/_lib/adminData.ts
import { prisma } from "@/lib/db";
import type { AdminReportRow } from "./adminTypes";

/**
 * Fetch the latest reports for the admin dashboard.
 * Includes basic company info and moderation metadata.
 */
export async function fetchAdminReports(): Promise<AdminReportRow[]> {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      status: true,
      company: {
        select: {
          name: true,
        },
      },
      country: true,
      stage: true,
      jobLevel: true,
      positionCategory: true,
      positionDetail: true,
      daysWithoutReply: true,
      flaggedAt: true,
      flaggedReason: true,
      deletedAt: true,
    },
  });

  return reports.map((report) => ({
    id: report.id,
    createdAt: report.createdAt,
    status: report.status,
    companyName: report.company.name,
    country: report.country,
    stage: report.stage,
    jobLevel: report.jobLevel,
    positionCategory: report.positionCategory,
    positionDetail: report.positionDetail,
    daysWithoutReply: report.daysWithoutReply,
    flaggedAt: report.flaggedAt,
    flaggedReason: report.flaggedReason,
    deletedAt: report.deletedAt,
  }));
}
