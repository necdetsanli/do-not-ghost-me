// src/app/api/companies/search/route.ts
import { env } from "@/env";
import { prisma } from "@/lib/db";
import { formatUnknownError } from "@/lib/errorUtils";
import { deriveCorrelationId, setCorrelationIdHeader } from "@/lib/correlation";
import { logError } from "@/lib/logger";
import { applyPublicRateLimit } from "@/lib/publicRateLimit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Rate limit scope for company search requests.
 */
const RATE_LIMIT_SCOPE = "company-search";

/**
 * Lightweight payload returned to the client for company name suggestions.
 * Kept intentionally minimal to avoid leaking unnecessary data.
 */
type CompanySuggestion = {
  id: string;
  name: string;
  country: string;
};

/**
 * Maximum accepted length for the search query.
 * This avoids overly large inputs turning into expensive DB queries.
 */
const MAX_QUERY_LENGTH: number = 120;

/**
 * Suggest existing companies by name prefix (case-insensitive).
 *
 * This endpoint is **best-effort**:
 * - It never writes to the database.
 * - It returns at most a small list of suggestions.
 * - IP-based rate limiting prevents enumeration and scraping attacks.
 *
 * Query params:
 * - q: partial company name typed by the user.
 *
 * Ordering:
 * - name ASC
 * - id ASC (tie-breaker for deterministic ordering)
 *
 * @param req - Incoming Next.js request.
 * @returns A JSON array of suggestions or an error payload on failure.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const correlationId = deriveCorrelationId(req);
  const withCorrelation = (res: NextResponse): NextResponse => {
    setCorrelationIdHeader(res, correlationId);
    return res;
  };

  // 1. Rate limiting - fail closed on missing IP
  const rateLimitResult = applyPublicRateLimit(req, {
    scope: RATE_LIMIT_SCOPE,
    maxRequests: env.RATE_LIMIT_COMPANY_SEARCH_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_COMPANY_SEARCH_WINDOW_MS,
    logContext: "[GET /api/companies/search]",
  });

  if (!rateLimitResult.allowed) {
    return withCorrelation(rateLimitResult.response);
  }

  // 2. Process search request
  try {
    const searchParams: URLSearchParams = req.nextUrl.searchParams;
    const rawQuery: string | null = searchParams.get("q");

    if (rawQuery === null) {
      return withCorrelation(NextResponse.json<CompanySuggestion[]>([], { status: 200 }));
    }

    const trimmed: string = rawQuery.trim();

    // Avoid noisy queries for empty input.
    if (trimmed.length === 0) {
      return withCorrelation(NextResponse.json<CompanySuggestion[]>([], { status: 200 }));
    }

    const q: string = trimmed.slice(0, MAX_QUERY_LENGTH);

    const companies = await prisma.company.findMany({
      where: {
        name: {
          startsWith: q,
          mode: "insensitive",
        },
      },
      orderBy: [
        {
          name: "asc",
        },
        {
          id: "asc",
        },
      ],
      take: 10,
      select: {
        id: true,
        name: true,
        country: true,
      },
    });

    const payload: CompanySuggestion[] = companies.map((company) => ({
      id: company.id,
      name: company.name,
      country: company.country,
    }));

    return withCorrelation(NextResponse.json(payload, { status: 200 }));
  } catch (error: unknown) {
    logError("[GET /api/companies/search] Unexpected error", {
      error: formatUnknownError(error),
      correlationId,
    });

    return withCorrelation(
      NextResponse.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
}
