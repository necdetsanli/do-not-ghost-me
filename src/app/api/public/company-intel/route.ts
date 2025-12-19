// src/app/api/public/company-intel/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import net from "node:net";
import { companyIntelRequestSchema } from "@/lib/contracts/companyIntel";
import { DEFAULT_COMPANY_INTEL_K_ANONYMITY, fetchCompanyIntel } from "@/lib/companyIntelService";
import { getClientIp } from "@/lib/ip";
import { PublicRateLimitError, enforcePublicIpRateLimit } from "@/lib/publicRateLimit";
import { logError } from "@/lib/logger";
import { formatUnknownError } from "@/lib/errorUtils";

export const dynamic = "force-dynamic";

const CACHE_CONTROL_HEADER = "public, s-maxage=120, stale-while-revalidate=600";
const NO_STORE_HEADERS = {
  "cache-control": "no-store",
};
const RATE_LIMIT_SCOPE = "company-intel";

/**
 * Parses a positive integer from an environment variable.
 *
 * @param raw - Raw env value.
 * @param fallback - Fallback value when unset/invalid.
 * @returns Parsed positive integer, or fallback.
 */
function parsePositiveIntEnv(raw: string | undefined, fallback: number): number {
  if (typeof raw !== "string") {
    return fallback;
  }

  const parsed: number = Number.parseInt(raw, 10);

  if (Number.isFinite(parsed) !== true) {
    return fallback;
  }

  if (parsed < 1) {
    return fallback;
  }

  return parsed;
}

const enforceKAnonymity: boolean = process.env.COMPANY_INTEL_ENFORCE_K_ANONYMITY === "true";
const kAnonymityThreshold: number = parsePositiveIntEnv(
  process.env.COMPANY_INTEL_K_ANONYMITY,
  DEFAULT_COMPANY_INTEL_K_ANONYMITY,
);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const clientIp: string | null = getClientIp(req);

  if (clientIp === null || net.isIP(clientIp) === 0) {
    return NextResponse.json(
      { error: "Rate limit unavailable" },
      { status: 429, headers: NO_STORE_HEADERS },
    );
  }

  try {
    enforcePublicIpRateLimit({
      ip: clientIp,
      scope: RATE_LIMIT_SCOPE,
    });
  } catch (error: unknown) {
    if (error instanceof PublicRateLimitError) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: error.statusCode, headers: NO_STORE_HEADERS },
      );
    }

    logError("[GET /api/public/company-intel] Rate limit failure", {
      error: formatUnknownError(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = companyIntelRequestSchema.safeParse({
    source: req.nextUrl.searchParams.get("source"),
    key: req.nextUrl.searchParams.get("key"),
  });

  if (parsed.success === false) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const intel = await fetchCompanyIntel(parsed.data, {
      kAnonymityThreshold,
      enforceKAnonymity,
    });

    if ("status" in intel) {
      return NextResponse.json(
        { status: "insufficient_data" },
        { status: 200, headers: { "cache-control": CACHE_CONTROL_HEADER } },
      );
    }
    return NextResponse.json(
      {
        company: {
          canonicalId: intel.companyId,
          ...(intel.displayName !== undefined ? { displayName: intel.displayName } : {}),
        },
        signals: intel.signals,
        updatedAt: intel.updatedAt.toISOString(),
      },
      { status: 200, headers: { "cache-control": CACHE_CONTROL_HEADER } },
    );
  } catch (error: unknown) {
    logError("[GET /api/public/company-intel] Unexpected error", {
      error: formatUnknownError(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
