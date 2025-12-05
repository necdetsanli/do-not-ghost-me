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
import { normalizeCompanyName, normalizeCountry } from "@/lib/normalization";

export const dynamic = "force-dynamic";

type CompanyProjection = {
  id: string;
  name: string;
  country: string | null;
};

type NormalizedCompanyInput = {
  normalizedCompanyName: string;
  normalizedCountry: string | null;
};

/**
 * Normalize company-related fields coming from the validated payload.
 */
function normalizeCompanyInput(data: ReportInput): NormalizedCompanyInput {
  const normalizedCompanyName = normalizeCompanyName(data.companyName);
  const normalizedCountry = normalizeCountry(data.country);

  return {
    normalizedCompanyName,
    normalizedCountry,
  };
}

/**
 * Find or create the Company record and optionally back-fill the country
 * for existing companies that do not yet have one.
 */
async function upsertCompany(
  input: NormalizedCompanyInput,
): Promise<CompanyProjection> {
  const { normalizedCompanyName, normalizedCountry } = input;

  let company = await prisma.company.findUnique({
    where: { name: normalizedCompanyName },
    select: {
      id: true,
      name: true,
      country: true,
    },
  });

  if (company == null) {
    company = await prisma.company.create({
      data: {
        name: normalizedCompanyName,
        country: normalizedCountry,
      },
      select: {
        id: true,
        name: true,
        country: true,
      },
    });

    return company;
  }

  if (company.country == null && normalizedCountry !== null) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        country: normalizedCountry,
      },
      select: {
        id: true,
        name: true,
        country: true,
      },
    });
  }

  return company;
}

/**
 * Convert a ReportRateLimitError into a JSON HTTP response.
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

    const data = parsed.data;

    // Honeypot check: if this field is filled, treat as bot and ignore silently.
    if (data.honeypot !== undefined && data.honeypot.length > 0) {
      return new NextResponse(null, { status: 204 });
    }

    const normalizedCompanyInput = normalizeCompanyInput(data);
    const company = await upsertCompany(normalizedCompanyInput);

    // Enforce rate limits before actually creating the report.
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
        country: normalizedCompanyInput.normalizedCountry,
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

    // Unexpected error — log and return generic 500.
    console.error("[POST /api/reports] Unexpected error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
