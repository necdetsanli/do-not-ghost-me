// src/app/api/security/csp-report/route.ts
import { deriveCorrelationId, setCorrelationIdHeader } from "@/lib/correlation";
import { logWarn } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReportBody = {
  "csp-report"?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Receives CSP report-only violation payloads and logs them.
 * Intentionally returns 204 to avoid leaking details to clients.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const correlationId = deriveCorrelationId(req);
  const withCorrelation = (res: NextResponse): NextResponse => {
    setCorrelationIdHeader(res, correlationId);
    return res;
  };

  try {
    const body = (await req.json()) as ReportBody;
    logWarn("[CSP-REPORT] Violation received", {
      correlationId,
      report: body["csp-report"] ?? body,
    });
  } catch (error: unknown) {
    logWarn("[CSP-REPORT] Failed to parse report body", {
      correlationId,
      error,
    });
  }

  return withCorrelation(new NextResponse(null, { status: 204 }));
}
