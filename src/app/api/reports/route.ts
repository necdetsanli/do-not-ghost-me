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

    const data: ReportInput = parsed.data;

    // Honeypot check: if this field is filled, treat as bot and ignore silently.
    if (typeof data.honeypot === "string" && data.honeypot.length > 0) {
      return new NextResponse(null, { status: 204 });
    }

    // Company lookup / creation with normalized name handled in lib/company.ts
    const company = await findOrCreateCompanyForReport({
      companyName: data.companyName,
      country: data.country ?? null,
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
        daysWithoutReply: data.daysWithoutReply,
        country: company.country,
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
