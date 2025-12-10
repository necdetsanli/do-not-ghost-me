// src/app/admin/_lib/adminData.ts
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import type { AdminReportRow } from "./adminTypes";

/**
 * Fetch the latest reports for the admin dashboard.
 *
 * Includes:
 * - company information (name and country),
 * - moderation metadata (status, flagged/deleted timestamps, reasons),
 * - basic report attributes needed for the moderation table.
 *
 * @returns A promise that resolves to an array of AdminReportRow objects,
 *          ordered by creation time (newest first) and limited to the most
 *          recent 100 reports.
 * @throws {Error} When Prisma fails or when a non-Error value is thrown,
 *                 the error is logged and rethrown to the caller.
 */
export async function fetchAdminReports(): Promise<AdminReportRow[]> {
  try {
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
            country: true,
          },
        },
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

    return reports.map(
      (report): AdminReportRow => ({
        id: report.id,
        createdAt: report.createdAt,
        status: report.status,
        companyName: report.company.name,
        country: report.company.country,
        stage: report.stage,
        jobLevel: report.jobLevel,
        positionCategory: report.positionCategory,
        positionDetail: report.positionDetail,
        daysWithoutReply: report.daysWithoutReply,
        flaggedAt: report.flaggedAt,
        flaggedReason: report.flaggedReason,
        deletedAt: report.deletedAt,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError("Failed to fetch admin reports", {
        errorName: error.name,
        errorMessage: error.message,
      });

      throw error;
    }

    logError("Failed to fetch admin reports: non-Error value thrown", {
      errorValueType: typeof error,
    });

    throw new Error("Unknown error while fetching admin reports");
  }
}
