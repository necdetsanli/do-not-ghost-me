// src/lib/rateLimit.ts
import crypto from "node:crypto";
import type { PositionCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { MISSING_IP_MESSAGE, ReportRateLimitError } from "@/lib/rateLimitError";
import { toUtcDayKey } from "@/lib/dates";
import { hasPrismaErrorCode } from "@/lib/prismaErrors";
import { logWarn, logError } from "@/lib/logger";
import { formatUnknownError } from "@/lib/errorUtils";

const MAX_REPORTS_PER_COMPANY_PER_IP: number =
  env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP;

const MAX_REPORTS_PER_IP_PER_DAY: number =
  env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY;

const DAILY_IP_LIMIT_MESSAGE =
  "You have reached the daily report limit for this IP address.";

const COMPANY_POSITION_LIMIT_MESSAGE =
  "You have reached the maximum number of reports for this company from this IP address.";

const DUPLICATE_POSITION_LIMIT_MESSAGE =
  "You have already submitted a report for this position at this company from this IP address.";

/**
 * Arguments required to enforce IP-based rate limits for report creation.
 */
type EnforceReportLimitArgs = {
  ip: string | null | undefined;
  companyId: string;
  positionCategory: PositionCategory;
  positionDetail: string;
};

/**
 * Normalizes an IP string and ensures it is present and non-empty.
 *
 * The string "unknown" (case-insensitive) is treated as missing.
 *
 * @param ip - The raw IP string value, or null/undefined.
 * @returns A trimmed IP string if valid.
 * @throws ReportRateLimitError If the IP is null, undefined, empty, or "unknown".
 */
function normalizeAndRequireIp(ip: string | null | undefined): string {
  if (ip === null || ip === undefined) {
    throw new ReportRateLimitError(MISSING_IP_MESSAGE, "missing-ip");
  }

  const trimmed: string = ip.trim();

  if (trimmed.length === 0 || trimmed.toLowerCase() === "unknown") {
    throw new ReportRateLimitError(MISSING_IP_MESSAGE, "missing-ip");
  }

  return trimmed;
}

/**
 * Hashes an IP address with a secret salt so that raw IPs are never stored.
 *
 * Exported so that unit tests can verify hashing behavior.
 *
 * @param ip - The raw IP address string to hash.
 * @returns A hex-encoded HMAC-SHA256 hash of the IP and salt.
 * @throws ReportRateLimitError If the provided IP string is empty after trimming.
 */
export function hashIp(ip: string): string {
  const trimmedIp: string = ip.trim();

  if (trimmedIp.length === 0) {
    throw new ReportRateLimitError(MISSING_IP_MESSAGE, "missing-ip");
  }

  // At this point env.RATE_LIMIT_IP_SALT is guaranteed non-empty and sufficiently long by env validation.
  const hmac: crypto.Hmac = crypto.createHmac("sha256", env.RATE_LIMIT_IP_SALT);
  hmac.update(trimmedIp);

  return hmac.digest("hex");
}

/**
 * Enforces IP-based rate limits for creating a report:
 *
 * - A global per-day limit from this IP (across all companies).
 * - A per-company limit from this IP.
 * - At most one report per (company, positionCategory, positionDetail) per IP.
 *
 * If a limit is reached, this function throws a ReportRateLimitError.
 * Database or network failures are rethrown as-is so that callers can
 * differentiate between rate-limit and infrastructure issues.
 *
 * @param args - Arguments for rate limiting.
 * @param args.ip - The client IP string (may be null/undefined and will be validated).
 * @param args.companyId - The company ID the report is associated with.
 * @param args.positionCategory - The position category for the report.
 * @param args.positionDetail - The free-text position detail string.
 * @returns A promise that resolves when limits are within bounds.
 * @throws ReportRateLimitError If any rate limit is exceeded or IP is missing.
 */
export async function enforceReportLimitForIpCompanyPosition(
  args: EnforceReportLimitArgs,
): Promise<void> {
  const { ip, companyId, positionCategory, positionDetail } = args;

  // Fail closed: no IP → no report.
  const normalizedIp: string = normalizeAndRequireIp(ip);
  const ipHash: string = hashIp(normalizedIp);

  // Use a simple UTC day key (YYYY-MM-DD) for per-day limits.
  const dayKey: string = toUtcDayKey();

  const maxPerCompany: number = MAX_REPORTS_PER_COMPANY_PER_IP;
  const maxPerDay: number = MAX_REPORTS_PER_IP_PER_DAY;

  // Normalize position into a stable key for uniqueness checks.
  const normalizedPositionDetail: string = positionDetail.trim().toLowerCase();
  const positionKey: string = `${positionCategory}:${normalizedPositionDetail}`;

  await prisma.$transaction(async (tx) => {
    // 1) Global per-day IP limit.
    const existingDaily = await tx.reportIpDailyLimit.findUnique({
      where: {
        uniq_ip_day: {
          ipHash,
          day: dayKey,
        },
      },
    });

    if (existingDaily === null) {
      try {
        await tx.reportIpDailyLimit.create({
          data: {
            ipHash,
            day: dayKey,
            count: 1,
          },
        });
      } catch (error: unknown) {
        const isUniqueViolation: boolean =
          hasPrismaErrorCode(error, "P2002") === true;

        if (isUniqueViolation === false) {
          logError("[rateLimit] Unexpected error creating daily IP limit row", {
            ipHash,
            day: dayKey,
            error: formatUnknownError(error),
          });
          throw error;
        }

        const concurrentDaily = await tx.reportIpDailyLimit.findUnique({
          where: {
            uniq_ip_day: {
              ipHash,
              day: dayKey,
            },
          },
        });

        if (concurrentDaily === null) {
          logError(
            "[rateLimit] Concurrent daily limit insert failed and follow-up lookup returned null",
            {
              ipHash,
              day: dayKey,
            },
          );
          throw error;
        }

        if (concurrentDaily.count >= maxPerDay) {
          logWarn("[rateLimit] Daily IP limit exceeded (concurrent path)", {
            ipHash,
            day: dayKey,
            maxPerDay,
            currentCount: concurrentDaily.count,
          });

          throw new ReportRateLimitError(
            DAILY_IP_LIMIT_MESSAGE,
            "daily-ip-limit",
          );
        }

        await tx.reportIpDailyLimit.update({
          where: {
            id: concurrentDaily.id,
          },
          data: {
            count: {
              increment: 1,
            },
          },
        });
      }
    } else {
      if (existingDaily.count >= maxPerDay) {
        logWarn("[rateLimit] Daily IP limit exceeded", {
          ipHash,
          day: dayKey,
          maxPerDay,
          currentCount: existingDaily.count,
        });

        throw new ReportRateLimitError(
          DAILY_IP_LIMIT_MESSAGE,
          "daily-ip-limit",
        );
      }

      await tx.reportIpDailyLimit.update({
        where: {
          id: existingDaily.id,
        },
        data: {
          count: {
            increment: 1,
          },
        },
      });
    }

    // 2) Per-company limit from this IP.
    const existingCompanyCount: number = await tx.reportIpCompanyLimit.count({
      where: {
        ipHash,
        companyId,
      },
    });

    if (existingCompanyCount >= maxPerCompany) {
      logWarn("[rateLimit] Per-company IP limit exceeded", {
        ipHash,
        companyId,
        maxPerCompany,
        currentCount: existingCompanyCount,
      });

      throw new ReportRateLimitError(
        COMPANY_POSITION_LIMIT_MESSAGE,
        "company-position-limit",
      );
    }

    // 3) Per-position uniqueness for this IP + company.
    try {
      await tx.reportIpCompanyLimit.create({
        data: {
          ipHash,
          companyId,
          positionKey,
        },
      });
    } catch (error: unknown) {
      const isUniqueViolation: boolean =
        hasPrismaErrorCode(error, "P2002") === true;

      if (isUniqueViolation === true) {
        logWarn(
          "[rateLimit] Duplicate report for company + position from this IP",
          {
            ipHash,
            companyId,
            positionKey,
          },
        );

        throw new ReportRateLimitError(
          DUPLICATE_POSITION_LIMIT_MESSAGE,
          "company-position-limit",
        );
      }

      // Unknown error (DB/network/etc.) – log and rethrow to be handled by the caller.
      logError(
        "[rateLimit] Unexpected error while enforcing company/position limit",
        {
          ipHash,
          companyId,
          positionKey,
          error: formatUnknownError(error),
        },
      );

      throw error;
    }
  });
}
