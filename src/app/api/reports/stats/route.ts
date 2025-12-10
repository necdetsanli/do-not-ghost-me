// src/app/api/reports/stats/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";
import { formatUnknownError } from "@/lib/errorUtils";

export const dynamic = "force-dynamic";

type MostReportedCompanyPayload = {
  name: string;
  reportCount: number;
};

type ReportsStatsResponseBody = {
  totalReports: number;
  mostReportedCompany: MostReportedCompanyPayload | null;
};

/**
 * Returns aggregated statistics about reports:
 * - total number of ACTIVE reports (FLAGGED/DELETED excluded)
 * - most reported company in the last 7 days among ACTIVE reports (if any)
 *
 * @param req - Incoming Next.js request.
 * @returns A JSON response with total reports and most reported company metadata.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const now: Date = new Date();
    const sevenDaysMs: number = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo: Date = new Date(now.getTime() - sevenDaysMs);

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
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          _count: {
            companyId: "desc",
          },
        },
        take: 1,
      }),
    ]);

    let mostReportedCompany: MostReportedCompanyPayload | null = null;

    /**
     * With noUncheckedIndexedAccess enabled, we must explicitly handle the
     * possibility that there is no element.
     */
    const [topGroup] = groups;

    if (topGroup !== undefined) {
      const company = await prisma.company.findUnique({
        where: {
          id: topGroup.companyId,
        },
        select: {
          name: true,
        },
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

    logInfo("[GET /api/reports/stats] Stats calculated", {
      totalReports,
      hasMostReportedCompany: mostReportedCompany !== null,
      path: req.nextUrl.pathname,
      method: req.method,
    });

    return NextResponse.json(body, { status: 200 });
  } catch (error: unknown) {
    logError("[GET /api/reports/stats] Unexpected error", {
      error: formatUnknownError(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
