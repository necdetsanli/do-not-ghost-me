// src/app/api/reports/stats/route.ts
import { env } from "@/env";
import { getUtcWeekStart } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatUnknownError } from "@/lib/errorUtils";
import { logError, logWarn } from "@/lib/logger";
import { applyPublicRateLimit } from "@/lib/publicRateLimit";
import { ReportStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Rate limit scope for reports stats requests.
 */
const RATE_LIMIT_SCOPE = "reports-stats";

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
 * Picks the most reported company deterministically:
 * - Primary: reportCount desc
 * - Tie-break: company name asc (case-insensitive)
 * - Final tie-break: companyId asc
 *
 * NOTE:
 * - This function does not assume `candidates` are pre-sorted.
 *
 * @param candidates - Candidate groups for this week.
 * @returns The chosen company payload or null.
 */
async function pickMostReportedCompanyThisWeek(
  candidates: Array<{ companyId: string; reportCount: number }>,
): Promise<MostReportedCompanyPayload | null> {
  if (candidates.length === 0) {
    return null;
  }

  // Invariant: candidates is non-empty, so maxCount is at least the max reportCount
  // of some element, guaranteeing at least one candidate will match in the filter.
  const maxCount: number = candidates.reduce((max, cur) => {
    return cur.reportCount > max ? cur.reportCount : max;
  }, 0);

  const tied = candidates.filter((c) => c.reportCount === maxCount);
  const ids: string[] = tied.map((t) => t.companyId);

  const companies = await prisma.company.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  const nameById = new Map<string, string>();
  for (const c of companies) {
    nameById.set(c.id, c.name);
  }

  const resolved = tied
    .map((t) => {
      const name = nameById.get(t.companyId);
      if (typeof name !== "string" || name.trim().length === 0) {
        return null;
      }
      return { companyId: t.companyId, name, reportCount: t.reportCount };
    })
    .filter((x): x is { companyId: string; name: string; reportCount: number } => x !== null);

  if (resolved.length === 0) {
    logWarn("[GET /api/reports/stats] No company records found for top groups", {
      companyIds: ids,
      maxCount,
    });
    return null;
  }

  resolved.sort((a, b) => {
    const nameCmp: number = a.name.localeCompare(b.name, "en", {
      sensitivity: "base",
    });

    if (nameCmp !== 0) {
      return nameCmp;
    }

    return a.companyId.localeCompare(b.companyId);
  });

  // Invariant: resolved.length > 0 is guaranteed by the early return above.
  // Use at(0) with a fallback that will never trigger due to the invariant.
  const winner = resolved.at(0);
  if (winner === undefined) {
    // This branch is unreachable due to the length check above,
    // but satisfies TypeScript's strict array access rules.
    return null;
  }

  return { name: winner.name, reportCount: winner.reportCount };
}

/**
 * Returns aggregated statistics about reports:
 * - total number of ACTIVE reports across all time
 * - most reported company in the current UTC week among ACTIVE reports (if any)
 *
 * @param req - The incoming request (used for IP-based rate limiting).
 * @returns A JSON response with total reports and most reported company metadata.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Rate Limiting (fail-closed) ---
  const rateLimitResult = applyPublicRateLimit(req, {
    scope: RATE_LIMIT_SCOPE,
    maxRequests: env.RATE_LIMIT_REPORTS_STATS_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_REPORTS_STATS_WINDOW_MS,
    logContext: "[GET /api/reports/stats]",
  });

  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  // --- Business Logic ---
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
        take: 50,
      }),
    ]);

    const candidates = groups.map((g) => ({
      companyId: g.companyId,
      reportCount: g._count.companyId,
    }));

    const mostReportedCompany = await pickMostReportedCompanyThisWeek(candidates);

    const body: ReportsStatsResponseBody = {
      totalReports,
      mostReportedCompany,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "cache-control": "no-store",
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
