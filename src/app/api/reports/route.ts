// src/app/api/reports/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportSchema } from "@/lib/validation/reportSchema";
import {
  enforceReportLimitForIpCompanyPosition,
  ReportRateLimitError,
} from "@/lib/rateLimit";

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor !== null && forwardedFor.length > 0) {
    const [first] = forwardedFor.split(",");
    const ip = first?.trim();
    if (ip !== undefined && ip.length > 0) {
      return ip;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directIp = (req as any).ip as string | undefined;
  if (directIp !== undefined && directIp !== null && directIp.length > 0) {
    return directIp;
  }

  return "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(req);

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

    // Honeypot check: if this field is filled, treat as bot and ignore silently
    if (
      data.honeypot !== null &&
      data.honeypot !== undefined &&
      data.honeypot.length > 0
    ) {
      return new NextResponse(null, { status: 204 });
    }

    const normalizedCompanyName = data.companyName.trim();
    const normalizedCountry =
      data.country !== null &&
      data.country !== undefined &&
      data.country.trim().length > 0
        ? data.country.trim()
        : null;

    // Find or create the company record, and keep country on the Company.
    let company = await prisma.company.findUnique({
      where: { name: normalizedCompanyName },
      select: {
        id: true,
        name: true,
        country: true,
      },
    });

    if (company === null || company === undefined) {
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
    } else if (
      (company.country === null || company.country === undefined) &&
      normalizedCountry !== null
    ) {
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
    if (error instanceof ReportRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // In production you may want to plug this into a proper logger
    console.error("[POST /api/reports] Unexpected error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
