// src/lib/rateLimit.ts
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import type { PositionCategory } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_MAX_REPORTS_PER_COMPANY_PER_IP = 3;

export class ReportRateLimitError extends Error {
  public readonly code = "REPORT_RATE_LIMIT";

  constructor(message: string) {
    super(message);
    this.name = "ReportRateLimitError";
  }
}

function getMaxReportsPerCompanyPerIp(): number {
  const raw = process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP;
  const parsed =
    typeof raw === "string" && raw.trim().length > 0 ? Number(raw) : NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_MAX_REPORTS_PER_COMPANY_PER_IP;
}

function getIpSalt(): string {
  const salt = process.env.RATE_LIMIT_IP_SALT;
  if (salt == null || salt.trim().length < 16) {
    // In production this MUST be set to a long, random value.
    // We still return a fixed fallback to avoid crashes in dev.
    return "dev-fallback-ip-salt-change-me";
  }
  return salt;
}

export function hashIp(ip: string): string {
  const salt = getIpSalt();
  return crypto.createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

function buildPositionKey(params: {
  positionCategory: PositionCategory;
  positionDetail: string;
}): string {
  const normalizedDetail = params.positionDetail.trim().toLowerCase();
  return `${params.positionCategory}:${normalizedDetail}`;
}

/**
 * Enforces the following rules:
 * - For a given IP (hashed) and companyId, a maximum of N reports is allowed (default 3).
 * - For a given IP (hashed), companyId and positionKey, only one report is allowed in total.
 *
 * This uses a dedicated table (ReportIpCompanyLimit) to store which
 * (ipHash, companyId, positionKey) combinations have already been used.
 */
export async function enforceReportLimitForIpCompanyPosition(params: {
  ip: string;
  companyId: string;
  positionCategory: PositionCategory;
  positionDetail: string;
}): Promise<void> {
  const { ip, companyId, positionCategory, positionDetail } = params;

  if (ip.length === 0 || ip === "unknown") {
    // In local development we skip IP-based limits.
    return;
  }

  const ipHash = hashIp(ip);
  const positionKey = buildPositionKey({ positionCategory, positionDetail });
  const maxReportsPerCompanyPerIp = getMaxReportsPerCompanyPerIp();

  // 1) Check how many distinct positions this IP has already reported for this company.
  const existingCount = await prisma.reportIpCompanyLimit.count({
    where: {
      ipHash,
      companyId,
    },
  });

  if (existingCount >= maxReportsPerCompanyPerIp) {
    throw new ReportRateLimitError(
      "You have reached the maximum number of reports for this company.",
    );
  }

  // 2) Try to register this specific position for this IP + company.
  // If it already exists, we do not allow another report for the same position.
  try {
    await prisma.reportIpCompanyLimit.create({
      data: {
        ipHash,
        companyId,
        positionKey,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint on (ipHash, companyId, positionKey) failed.
      throw new ReportRateLimitError(
        "You have already submitted a report for this position at this company.",
      );
    }

    // Any other DB error is not a rate-limit violation, bubble it up.
    throw error;
  }
}
