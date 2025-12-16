// src/app/api/reports/stats/route.ts
import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { formatUnknownError } from "@/lib/errorUtils";
import { getUtcWeekStart } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Payload for the "most reported company" object returned by the stats endpoint.
 */
type MostReportedCompanyPayload = {
  /**
   * Company display name.
   */
  name: string;

  /**
   * Number of ACTIVE reports for this company in the current UTC week.
   */
  reportCount: number;
};

/**
 * Response body shape for GET /api/reports/stats.
 */
type ReportsStatsResponseBody = {
  /**
   * Total number of ACTIVE reports across all time.
   */
  totalReports: number;

  /**
   * Most reported company for the current UTC week among ACTIVE reports, or null if none.
   */
  mostReportedCompany: MostReportedCompanyPayload | null;
};

/**
 * Adds a number of days to a Date in UTC by using millisecond arithmetic.
 *
 * @param date - Base date.
 * @param days - Number of days to add.
 * @returns A new Date advanced by the given number of days.
 */
function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Returns aggregated statistics about reports:
 * - total number of ACTIVE reports (FLAGGED/DELETED excluded)
 * - most reported company in the current UTC week among ACTIVE reports (if any)
 *
 * This endpoint is safe to poll:
 * - it returns only aggregated public stats already shown on the home page
 * - it uses conservative cache headers to reduce database load
 *
 * @returns A JSON response with total reports and most reported company metadata.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const now: Date = new Date();
    const weekStartUtc: Date = getUtcWeekStart(now);
    const weekEndUtc: Date = addDaysUtc(weekStartUtc, 7);

    const [totalReports, groups] = await Promise.all([
      prisma.report.count({
        where: {
          status: ReportStatus.ACTIVE,
        },
      }),
      prisma.report.groupBy({
        by: ["companyId"],
        _count: {
          companyId: true,
        },
        where: {
          status: ReportStatus.ACTIVE,
          createdAt: {
            gte: weekStartUtc,
            lt: weekEndUtc,
          },
        },
        orderBy: [
          {
            _count: { companyId: "desc" },
          },
          {
            companyId: "asc",
          },
        ],
        take: 1,
      }),
    ]);

    let mostReportedCompany: MostReportedCompanyPayload | null = null;
    const topGroup = groups[0];

    if (topGroup !== undefined) {
      const company = await prisma.company.findUnique({
        where: { id: topGroup.companyId },
        select: { name: true },
      });

      if (company !== null) {
        mostReportedCompany = {
          name: company.name,
          reportCount: topGroup._count.companyId,
        };
      }
    }

    const body: ReportsStatsResponseBody = {
      totalReports,
      mostReportedCompany,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "cache-control":
          "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
      },
    });
  } catch (error: unknown) {
    logError("[GET /api/reports/stats] Unexpected error", {
      error: formatUnknownError(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }
}
