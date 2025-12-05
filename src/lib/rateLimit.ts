// src/lib/rateLimit.ts
import crypto from "node:crypto";
import { PositionCategory } from "@prisma/client";
import { prisma } from "@/lib/db";

export class ReportRateLimitError extends Error {
  public readonly code: "REPORT_RATE_LIMIT";

  constructor(message: string) {
    super(message);
    this.name = "ReportRateLimitError";
    this.code = "REPORT_RATE_LIMIT";
  }
}

function getEnvInt(
  key: string,
  fallback: number,
  options?: { min?: number },
): number {
  const raw = process.env[key];

  if (raw == null || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (options?.min != null && parsed < options.min) {
    return options.min;
  }

  return parsed;
}

function getMaxReportsPerCompanyPerIp(): number {
  return getEnvInt("RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP", 3, {
    min: 1,
  });
}

function getMaxReportsPerIpPerDay(): number {
  return getEnvInt("RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY", 20, {
    min: 1,
  });
}

/**
 * Returns true if the IP should be treated as "unknown" and ignored.
 */
function isUnknownIp(ip: string | null | undefined): boolean {
  if (ip == null) {
    return true;
  }

  const trimmed = ip.trim();

  if (trimmed === "") {
    return true;
  }

  // Your app uses "unknown" when the real IP cannot be determined.
  if (trimmed.toLowerCase() === "unknown") {
    return true;
  }

  return false;
}

/**
 * Hash the IP with a salt so we never store raw addresses.
 */
export function hashIp(ip: string): string {
  const trimmed = ip.trim();

  if (trimmed === "") {
    throw new Error("Cannot hash empty IP string.");
  }

  const salt = process.env.RATE_LIMIT_IP_SALT;

  const effectiveSalt =
    salt != null && salt.length >= 16
      ? salt
      : "dev-only-fallback-salt-change-me-in-production";

  const hash = crypto.createHash("sha256");

  hash.update(effectiveSalt);
  hash.update("|");
  hash.update(trimmed);

  return hash.digest("hex");
}

/**
 * Helper to detect unique-constraint errors without depending
 * on Prisma's specific error class in tests.
 */
function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  const codeValue = (error as { code?: unknown }).code;

  return typeof codeValue === "string" && codeValue === "P2002";
}

/**
 * Enforce:
 * - Global per-day limit from this IP (across companies).
 * - Per-company limit from this IP.
 * - No duplicate reports for the same position at the same company from the same IP.
 */
export async function enforceReportLimitForIpCompanyPosition(args: {
  ip: string | null | undefined;
  companyId: string;
  positionCategory: PositionCategory;
  positionDetail: string;
}): Promise<void> {
  const { ip, companyId, positionCategory, positionDetail } = args;

  // If we do not have a usable IP, do not enforce limits.
  if (isUnknownIp(ip)) {
    return;
  }

  const trimmedIp = ip!.trim();
  const ipHash = hashIp(trimmedIp);

  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10); // YYYY-MM-DD in UTC

  const maxPerCompany = getMaxReportsPerCompanyPerIp();
  const maxPerDay = getMaxReportsPerIpPerDay();

  // Normalize position into a stable key.
  const normalizedPositionDetail = positionDetail.trim().toLowerCase();
  const positionKey = `${positionCategory}:${normalizedPositionDetail}`;

  await prisma.$transaction(async (tx) => {
    // 1) Global per-day IP limit
    const existingDaily = await tx.reportIpDailyLimit.findUnique({
      where: {
        ipHash_day: {
          ipHash,
          day: dayKey,
        },
      },
    });

    if (existingDaily == null) {
      await tx.reportIpDailyLimit.create({
        data: {
          ipHash,
          day: dayKey,
          count: 1,
        },
      });
    } else {
      if (existingDaily.count >= maxPerDay) {
        throw new ReportRateLimitError(
          "You have reached the daily report limit from this network.",
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

    // 2) Per-company limit from this IP
    const existingCompanyCount = await tx.reportIpCompanyLimit.count({
      where: {
        ipHash,
        companyId,
      },
    });

    if (existingCompanyCount >= maxPerCompany) {
      throw new ReportRateLimitError(
        "You have reached the maximum number of reports for this company from this network.",
      );
    }

    // 3) Per-position uniqueness for this IP + company
    try {
      await tx.reportIpCompanyLimit.create({
        data: {
          ipHash,
          companyId,
          positionKey,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ReportRateLimitError(
          "You have already submitted a report for this position at this company from this network.",
        );
      }

      throw error;
    }
  });
}
