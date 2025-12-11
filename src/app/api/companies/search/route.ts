// src/app/api/companies/search/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { formatUnknownError } from "@/lib/errorUtils";

export const dynamic = "force-dynamic";

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
 * Suggest existing companies by name prefix (case-insensitive).
 *
 * This endpoint is **best-effort**:
 * - It never writes to the database.
 * - It returns at most a small list of suggestions.
 * - It does not enforce rate limiting yet; abuse protection is expected to be
 *   handled at the infrastructure (WAF / edge) layer if necessary.
 *
 * Query params:
 * - q: partial company name typed by the user.
 *
 * @param req - Incoming Next.js request.
 * @returns A JSON array of suggestions or an error payload on failure.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams: URLSearchParams = req.nextUrl.searchParams;
    const rawQuery: string | null = searchParams.get("q");

    if (rawQuery === null) {
      return NextResponse.json<CompanySuggestion[]>([], { status: 200 });
    }

    const trimmed: string = rawQuery.trim();

    // Avoid noisy queries for empty input.
    if (trimmed.length === 0) {
      return NextResponse.json<CompanySuggestion[]>([], { status: 200 });
    }

    const companies = await prisma.company.findMany({
      where: {
        name: {
          startsWith: trimmed,
          mode: "insensitive",
        },
      },
      orderBy: {
        name: "asc",
      },
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

    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    logError("[GET /api/companies/search] Unexpected error", {
      error: formatUnknownError(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
