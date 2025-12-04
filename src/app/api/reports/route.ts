// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportSchema } from "@/lib/validation/reportSchema";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();

    // Validate request body with Zod
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
    if (data.honeypot && data.honeypot.length > 0) {
      // 204 with empty body gives no useful signal to bots
      return new NextResponse(null, { status: 204 });
    }

    const normalizedCompanyName = data.companyName.trim();

    // Find or create company first, and keep country on the Company record
    let company = await prisma.company.findUnique({
      where: { name: normalizedCompanyName },
    });

    if (!company) {
      // First time we see this company: create it with the provided country (if any)
      company = await prisma.company.create({
        data: {
          name: normalizedCompanyName,
          country: data.country ?? null,
        },
      });
    } else if (!company.country && data.country) {
      // Company exists but has no country yet; set it once from the first non-empty report
      company = await prisma.company.update({
        where: { id: company.id },
        data: { country: data.country },
      });
    }
    // If company already has a country and a new report sends a different one,
    // we keep the existing value to avoid random users overwriting it.

    // Create the report and link it to the company
    const report = await prisma.report.create({
      data: {
        companyId: company.id,
        stage: data.stage,
        jobLevel: data.jobLevel,
        positionCategory: data.positionCategory,
        positionDetail: data.positionDetail,
        daysWithoutReply: data.daysWithoutReply,
        country: data.country ?? null,
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
    // In production you may want to plug this into a proper logger
    console.error("[POST /api/reports] Unexpected error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
