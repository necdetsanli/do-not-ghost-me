import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalization";
import { logWarn } from "@/lib/logger";
import type {
  CompanyIntelRequest,
  ConfidenceLevel,
} from "@/lib/contracts/companyIntel";

const NINETY_DAYS_IN_MS = 90 * 24 * 60 * 60 * 1000;

export const DEFAULT_COMPANY_INTEL_K_ANONYMITY = 5;

/**
 * Shape of the signals returned by the service layer.
 */
export type CompanyIntelSignals = {
  reportCountTotal: number;
  reportCount90d: number;
  riskScore: number | null;
  confidence: ConfidenceLevel;
};

/**
 * Successful intel lookup result.
 */
export type CompanyIntelSuccess = {
  companyId: string;
  displayName?: string;
  signals: CompanyIntelSignals;
  updatedAt: Date;
};

/**
 * Intel result discriminated union.
 */
export type CompanyIntelResult =
  | CompanyIntelSuccess
  | { status: "insufficient_data" };

/**
 * Extracts a registrable-ish label from a normalized host string.
 *
 * Heuristic:
 * - Prefer the second-to-last label (example.com -> example).
 * - When using common second-level suffixes (co|com|org|net|gov|edu),
 *   fall back to the label before that (acme.co.uk -> acme).
 *
 * @param host - Normalized host string (lower-case, no protocol/port).
 * @returns The candidate label or null when none can be derived.
 */
function deriveDomainLabel(host: string): string | null {
  const parts: string[] = host.split(".").filter((part) => part.length > 0);

  if (parts.length < 2) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] ?? null;
  }

  const lastIndex: number = parts.length - 1;
  const secondLast: string = parts[lastIndex - 1] ?? "";
  const thirdLast: string = parts[lastIndex - 2] ?? "";

  const suffixes = new Set(["co", "com", "org", "net", "gov", "edu"]);

  if (suffixes.has(secondLast) && thirdLast !== "") {
    return thirdLast;
  }

  return secondLast || null;
}

/**
 * Builds a normalized company key suitable for lookups against Company.normalizedName.
 *
 * @param request - Validated company intel request.
 * @returns Normalized key string or null when no usable key can be derived.
 */
export function deriveNormalizedCompanyKey(
  request: CompanyIntelRequest,
): string | null {
  if (request.source === "domain") {
    const label: string | null = deriveDomainLabel(request.key);

    if (label === null) {
      return null;
    }

    const normalizedFromDomain: string = normalizeCompanyName(label);
    return normalizedFromDomain === "" ? null : normalizedFromDomain;
  }

  const normalized: string = normalizeCompanyName(request.key);
  return normalized === "" ? null : normalized;
}

/**
 * Computes a simple confidence heuristic based on sample size and recency.
 *
 * @param total - Total number of reports for the company.
 * @param recent - Number of reports in the trailing 90-day window.
 * @returns Confidence level.
 */
function deriveConfidence(total: number, recent: number): ConfidenceLevel {
  if (total >= 30 || recent >= 15) {
    return "high";
  }

  if (total >= 15 || recent >= 5) {
    return "medium";
  }

  return "low";
}

/**
 * Aggregates company intel for the public API without exposing any user content.
 *
 * Steps:
 * 1) Normalize the lookup key from the source/key pair.
 * 2) Find the company with the highest ACTIVE report count matching the key.
 * 3) Enforce k-anonymity on total report count.
 * 4) Fetch 90d counts and latest activity timestamp.
 *
 * @param request - Validated request parameters.
 * @param options - Optional overrides for testing/tuning.
 * @returns Aggregated signals or an insufficient_data marker.
 */
export async function fetchCompanyIntel(
  request: CompanyIntelRequest,
  options?: {
    kAnonymityThreshold?: number;
    now?: Date;
  },
): Promise<CompanyIntelResult> {
  const normalizedKey: string | null = deriveNormalizedCompanyKey(request);

  if (normalizedKey === null) {
    return { status: "insufficient_data" };
  }

  const now: Date = options?.now ?? new Date();
  const ninetyDaysAgo: Date = new Date(now.getTime() - NINETY_DAYS_IN_MS);
  const kAnonymity: number =
    options?.kAnonymityThreshold ?? DEFAULT_COMPANY_INTEL_K_ANONYMITY;

  const grouped = await prisma.report.groupBy({
    by: ["companyId"],
    where: {
      status: ReportStatus.ACTIVE,
      company: {
        normalizedName: normalizedKey,
      },
    },
    _count: {
      _all: true,
    },
    orderBy: [
      {
        _count: {
          _all: "desc",
        },
      },
      {
        companyId: "asc",
      },
    ],
    take: 1,
  });

  if (grouped.length === 0) {
    return { status: "insufficient_data" };
  }

  const [top] = grouped;
  const reportCountTotal: number = top._count._all ?? 0;

  if (reportCountTotal < kAnonymity) {
    return { status: "insufficient_data" };
  }

  const companyId: string = top.companyId;

  const [reportCount90d, company] = await Promise.all([
    prisma.report.count({
      where: {
        companyId,
        status: ReportStatus.ACTIVE,
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (company === null) {
    logWarn("[company-intel] Company row missing for grouped reports", {
      companyId,
      normalizedKey,
    });

    return { status: "insufficient_data" };
  }

  const trimmedName: string = company.name.trim();
  const displayName: string | undefined =
    trimmedName.length > 0 ? trimmedName : undefined;

  const confidence: ConfidenceLevel = deriveConfidence(
    reportCountTotal,
    reportCount90d,
  );

  return {
    companyId,
    displayName,
    signals: {
      reportCountTotal,
      reportCount90d,
      riskScore: null,
      confidence,
    },
    updatedAt: now,
  };
}
