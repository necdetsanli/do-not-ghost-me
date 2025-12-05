// src/app/api/reports/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportSchema } from "@/lib/validation/reportSchema";
import { enforceReportLimitForIpCompanyPosition } from "@/lib/rateLimit";
import {
  ReportRateLimitError,
  isReportRateLimitError,
} from "@/lib/rateLimitError";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

/**
 * Common select shape for Company records so we do not repeat it.
 */
const COMPANY_SELECT = {
  id: true,
  name: true,
  country: true,
} as const;

/**
 * Normalize an optional country string:
 * - null/undefined/empty → null
 * - otherwise → trimmed value
 */
function normalizeOptionalCountry(
  country: string | null | undefined,
): string | null {
  if (country === null || country === undefined) {
    return null;
  }

  const trimmed = country.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

/**
 * Resolve a company by name, creating it if it does not exist.
 *
 * If the company exists without a country and we receive a non-null country,
 * we update the record to fill in the country information.
 */
async function resolveCompany(args: { name: string; country: string | null }) {
  const { name, country } = args;

  const existing = await prisma.company.findUnique({
    where: { name },
    select: COMPANY_SELECT,
  });

  if (existing === null) {
    return prisma.company.create({
      data: {
        name,
        country,
      },
      select: COMPANY_SELECT,
    });
  }

  if (
    (existing.country === null || existing.country === undefined) &&
    country !== null
  ) {
    return prisma.company.update({
      where: { id: existing.id },
      data: { country },
      select: COMPANY_SELECT,
    });
  }

  return existing;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(req);

  // Fail closed: if we cannot determine an IP, do not accept the report.
  if (clientIp === null || clientIp.trim().length === 0) {
    const error = new ReportRateLimitError(
      "We could not determine your IP address. Please try again later.",
      "missing-ip",
    );

    return NextResponse.json(
      {
        error: error.message,
        reason: error.reason,
      },
      { status: error.statusCode },
    );
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

    const data = parsed.data;

    // Honeypot check: if this field is filled, treat as bot and ignore silently.
    if (
      data.honeypot !== null &&
      data.honeypot !== undefined &&
      data.honeypot.length > 0
    ) {
      return new NextResponse(null, { status: 204 });
    }

    const normalizedCompanyName = data.companyName.trim();
    const normalizedCountry = normalizeOptionalCountry(data.country);

    const company = await resolveCompany({
      name: normalizedCompanyName,
      country: normalizedCountry,
    });

    // Enforce IP + company + position limits BEFORE creating the report.
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
        country: normalizedCountry,
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
  } catch (error) {
    // Domain-level rate limit errors: map to 429 with structured payload.
    if (isReportRateLimitError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          reason: error.reason,
        },
        { status: error.statusCode },
      );
    }

    // Malformed JSON body → treat as bad request instead of 500.
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        { status: 400 },
      );
    }

    // Everything else is an unexpected server-side failure.
    console.error("[POST /api/reports] Unexpected error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
