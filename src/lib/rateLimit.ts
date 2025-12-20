// src/lib/rateLimit.ts
import crypto from "node:crypto";
import type { PositionCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import {
  MISSING_IP_MESSAGE,
  DAILY_IP_LIMIT_MESSAGE,
  COMPANY_POSITION_LIMIT_MESSAGE,
  DUPLICATE_POSITION_LIMIT_MESSAGE,
  ReportRateLimitError,
} from "@/lib/rateLimitError";
import { toUtcDayKey } from "@/lib/dates";
import { hasPrismaErrorCode } from "@/lib/prismaErrors";
import { logWarn, logError } from "@/lib/logger";
import { formatUnknownError } from "@/lib/errorUtils";

const MAX_REPORTS_PER_COMPANY_PER_IP: number = env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP;

const MAX_REPORTS_PER_IP_PER_DAY: number = env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY;

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
 * Concurrency notes:
 * - Daily counting is done via UPSERT (atomic) and validated after the increment.
 * - Per-company counting is protected by a PostgreSQL advisory transaction lock
 *   on (ipHash, companyId) to make count+insert strict under concurrency.
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
    // 1) Global per-day IP limit (atomic UPSERT).
    let dailyRow: { id: string; count: number };

    try {
      dailyRow = await tx.reportIpDailyLimit.upsert({
        where: {
          uniq_ip_day: {
            ipHash,
            day: dayKey,
          },
        },
        create: {
          ipHash,
          day: dayKey,
          count: 1,
        },
        update: {
          count: {
            increment: 1,
          },
        },
        select: {
          id: true,
          count: true,
        },
      });
    } catch (error: unknown) {
      logError("[rateLimit] Unexpected error upserting daily IP limit row", {
        ipHash,
        day: dayKey,
        error: formatUnknownError(error),
      });
      throw error;
    }

    if (dailyRow.count > maxPerDay) {
      logWarn("[rateLimit] Daily IP limit exceeded", {
        ipHash,
        day: dayKey,
        maxPerDay,
        currentCount: dailyRow.count,
      });

      throw new ReportRateLimitError(DAILY_IP_LIMIT_MESSAGE, "daily-ip-limit");
    }

    // 2) Strict per-company enforcement under concurrency using advisory lock.
    // This serializes rate-limit checks for the same (ipHash, companyId) pair.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ipHash}), hashtext(${companyId}))`;

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

      throw new ReportRateLimitError(COMPANY_POSITION_LIMIT_MESSAGE, "company-position-limit");
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
      const isUniqueViolation: boolean = hasPrismaErrorCode(error, "P2002") === true;

      if (isUniqueViolation === true) {
        logWarn("[rateLimit] Duplicate report for company + position from this IP", {
          ipHash,
          companyId,
          positionKey,
        });

        throw new ReportRateLimitError(DUPLICATE_POSITION_LIMIT_MESSAGE, "company-position-limit");
      }

      logError("[rateLimit] Unexpected error while enforcing company/position limit", {
        ipHash,
        companyId,
        positionKey,
        error: formatUnknownError(error),
      });

      throw error;
    }
  });
}
