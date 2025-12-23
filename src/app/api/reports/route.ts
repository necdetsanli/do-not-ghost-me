// src/app/api/reports/route.ts
import { findOrCreateCompanyForReport } from "@/lib/company";
import { prisma } from "@/lib/db";
import { formatUnknownError } from "@/lib/errorUtils";
import { getClientIp } from "@/lib/ip";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { enforceReportLimitForIpCompanyPosition } from "@/lib/rateLimit";
import {
  MISSING_IP_MESSAGE,
  ReportRateLimitError,
  isReportRateLimitError,
} from "@/lib/rateLimitError";
import { reportSchema, type ReportInput } from "@/lib/validation/reportSchema";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Minimal shape of a validation issue required for honeypot checks.
 */
type HoneypotIssue = {
  path: PropertyKey[];
};

/**
 * Maps a {@link ReportRateLimitError} to a JSON HTTP response.
 *
 * This keeps all rate limit responses consistent across:
 * - missing IP
 * - per-day IP limit
 * - per-company-per-IP limit
 * - duplicate position submissions
 *
 * @param error - The domain-specific rate limit error.
 * @returns A NextResponse with the appropriate HTTP status and JSON payload.
 */
function mapRateLimitErrorToResponse(error: ReportRateLimitError): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
    },
    { status: error.statusCode },
  );
}

/**
 * Returns true if all validation issues are related exclusively
 * to the honeypot field.
 *
 * This allows us to treat "honeypot filled" as a bot submission and
 * silently drop it, instead of surfacing a 400 validation error.
 *
 * Invariant: This function is only called when `safeParse.success === false`,
 * meaning Zod guarantees at least one issue exists. Honeypot is a top-level
 * field, so its path is always `["honeypot"]`.
 *
 * @param issues - The Zod issues array from a failed parse (non-empty).
 * @returns True if every issue path starts with "honeypot", false otherwise.
 */
function isHoneypotOnlyValidationError(issues: HoneypotIssue[]): boolean {
  return issues.every((issue: HoneypotIssue): boolean => issue.path[0] === "honeypot");
}

/**
 * Handle incoming ghosting reports.
 *
 * Pipeline:
 * 1. Extract client IP from the request and fail closed if it is missing.
 * 2. Parse and validate the JSON payload using {@link reportSchema}.
 * 3. If validation fails *only* because the honeypot is filled, treat it as
 *    a bot submission and silently drop with HTTP 200.
 * 4. Find or create the corresponding company using a normalized name key.
 * 5. Enforce per-IP and per-company rate limits before writing anything.
 * 6. Persist the report row and return a 200 response with its identifier.
 *
 * On validation errors (excluding honeypot-only): HTTP 400 + structured Zod error.
 * On rate limit violations: HTTP 429 + user-friendly message.
 * On unexpected failures: log and respond with HTTP 500.
 *
 * @param req - The incoming Next.js request.
 * @returns A JSON NextResponse indicating success or failure.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientIpRaw: string | null = getClientIp(req);

  // Fail closed: if we cannot determine an IP, do not accept the report.
  if (clientIpRaw === null || clientIpRaw === undefined) {
    const error = new ReportRateLimitError(MISSING_IP_MESSAGE, "missing-ip");

    logWarn("[POST /api/reports] Missing client IP address", {
      path: req.nextUrl.pathname,
      method: req.method,
      ip: clientIpRaw,
    });

    return mapRateLimitErrorToResponse(error);
  }

  const clientIp: string = clientIpRaw.trim();

  if (clientIp.length === 0) {
    const error = new ReportRateLimitError(MISSING_IP_MESSAGE, "missing-ip");

    logWarn("[POST /api/reports] Empty client IP after trim", {
      path: req.nextUrl.pathname,
      method: req.method,
      ip: clientIpRaw,
    });

    return mapRateLimitErrorToResponse(error);
  }

  let json: unknown;

  try {
    json = await req.json();
  } catch (parseError: unknown) {
    logWarn("[POST /api/reports] Invalid JSON payload", {
      path: req.nextUrl.pathname,
      method: req.method,
      ip: clientIp,
      error: formatUnknownError(parseError),
    });

    return NextResponse.json(
      {
        error: "Invalid JSON payload",
      },
      { status: 400 },
    );
  }

  try {
    const parsed = reportSchema.safeParse(json);

    if (parsed.success === false) {
      if (isHoneypotOnlyValidationError(parsed.error.issues)) {
        logInfo("[POST /api/reports] Honeypot triggered (validation)", {
          ip: clientIp,
          path: req.nextUrl.pathname,
          userAgent: req.headers.get("user-agent") ?? undefined,
        });

        // Honeypot: treat as bot submission and silently succeed.
        return new NextResponse(null, { status: 200 });
      }

      logWarn("[POST /api/reports] Report validation failed", {
        ip: clientIp,
        path: req.nextUrl.pathname,
        issues: parsed.error.issues,
      });

      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data: ReportInput = parsed.data;

    // Company lookup / creation with normalized name handled in lib/company.ts.
    const company = await findOrCreateCompanyForReport({
      companyName: data.companyName,
      country: data.country,
    });

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
        // daysWithoutReply is optional/nullable in validation and schema.
        daysWithoutReply: data.daysWithoutReply ?? null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    logInfo("[POST /api/reports] Report created", {
      reportId: report.id,
      companyId: company.id,
      ip: clientIp,
      positionCategory: data.positionCategory,
      positionDetail: data.positionDetail,
    });

    return NextResponse.json(
      {
        id: report.id,
        createdAt: report.createdAt,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (isReportRateLimitError(error)) {
      logWarn("[POST /api/reports] Rate limit hit for report creation", {
        ip: clientIp,
        path: req.nextUrl.pathname,
        reason: error.reason,
        statusCode: error.statusCode,
        message: error.message,
      });

      return mapRateLimitErrorToResponse(error);
    }

    logError("[POST /api/reports] Unexpected error", {
      ip: clientIp,
      path: req.nextUrl.pathname,
      error: formatUnknownError(error),
    });

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
