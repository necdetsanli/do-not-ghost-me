// src/app/api/reports/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportSchema, type ReportInput } from "@/lib/validation/reportSchema";
import { enforceReportLimitForIpCompanyPosition } from "@/lib/rateLimit";
import {
  ReportRateLimitError,
  isReportRateLimitError,
} from "@/lib/rateLimitError";
import { getClientIp } from "@/lib/ip";
import { findOrCreateCompanyForReport } from "@/lib/company";

export const dynamic = "force-dynamic";

/**
 * Map a {@link ReportRateLimitError} to a JSON HTTP response.
 *
 * This keeps all rate limit responses consistent across:
 * - missing IP
 * - per-day IP limit
 * - per-company-per-IP limit
 * - duplicate position submissions
 */
function mapRateLimitErrorToResponse(
  error: ReportRateLimitError,
): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
    },
    { status: error.statusCode },
  );
}

/**
 * Handle incoming ghosting reports.
 *
 * Pipeline:
 * 1. Extract client IP from the request and fail closed if it is missing.
 * 2. Parse and validate the JSON payload using {@link reportSchema}.
 * 3. Drop obvious bots via a hidden honeypot field.
 * 4. Find or create the corresponding company using a normalized name key.
 * 5. Enforce per-IP and per-company rate limits before writing anything.
 * 6. Persist the report row and return a 201 response with its identifier.
 *
 * On validation errors: responds with HTTP 400 and a structured Zod error.
 * On rate limit violations: responds with HTTP 429 and a user-friendly message.
 * On unexpected failures: logs the error and responds with HTTP 500.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(req);

  // Fail closed: if we cannot determine an IP, do not accept the report.
  if (clientIp == null || clientIp.trim().length === 0) {
    const error = new ReportRateLimitError(
      "We could not determine your IP address. Please try again later.",
      "missing-ip",
    );

    return mapRateLimitErrorToResponse(error);
  }

  try {
    const json = await req.json();
    const parsed = reportSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data: ReportInput = parsed.data;

    // Honeypot check: if this field is filled, treat as bot and ignore silently.
    if (typeof data.honeypot === "string" && data.honeypot.length > 0) {
      return new NextResponse(null, { status: 204 });
    }

    // Company lookup / creation with normalized name handled in lib/company.ts
    const company = await findOrCreateCompanyForReport({
      companyName: data.companyName,
    });
    // Decide which country value to store on the report:
    // - Prefer the country provided with this report (per-office / per-location).
    // - Fall back to the company’s known country if the report did not specify one.
    //const reportCountry = data.country ?? null;

    // Enforce rate limits BEFORE creating the report.
    await enforceReportLimitForIpCompanyPosition({
      ip: clientIp,
      companyId: company.id,
      positionCategory: data.positionCategory,
      positionDetail: data.positionDetail,
    });

    const report = await prisma.report.create({
      data: {
        companyId: company.id,
        stage: data.stage,
        jobLevel: data.jobLevel,
        positionCategory: data.positionCategory,
        positionDetail: data.positionDetail,
        daysWithoutReply: data.daysWithoutReply,
        country: data.country,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        id: report.id,
        createdAt: report.createdAt,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (isReportRateLimitError(error)) {
      return mapRateLimitErrorToResponse(error);
    }

    console.error("[POST /api/reports] Unexpected error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
