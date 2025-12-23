// src/app/api/admin/logout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { adminSessionCookieOptions, isAllowedAdminHost, isOriginAllowed } from "@/lib/adminAuth";
import { deriveCorrelationId, setCorrelationIdHeader } from "@/lib/correlation";
import { adminJsonError } from "@/lib/adminErrorResponse";
import { logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Log out the current admin by clearing the session cookie.
 *
 * This endpoint is API-only:
 * - It no longer performs any redirects.
 * - Clients are responsible for navigation after a successful logout.
 */
export function POST(req: NextRequest): NextResponse {
  const correlationId = deriveCorrelationId(req);

  const withCorrelation = (res: NextResponse): NextResponse => {
    setCorrelationIdHeader(res, correlationId);
    return res;
  };

  const hostAllowed: boolean = isAllowedAdminHost(req);
  const originAllowed: boolean = isOriginAllowed(req);

  if (hostAllowed !== true || originAllowed !== true) {
    logWarn(
      "[POST /api/admin/logout] Logout blocked due to disallowed host/origin",
      {
        host: req.headers.get("host"),
        origin: req.headers.get("origin"),
        referer: req.headers.get("referer"),
        allowedHost: env.ADMIN_ALLOWED_HOST ?? null,
        correlationId,
      },
    );

    return withCorrelation(adminJsonError("Admin access is not allowed from this host.", { status: 403 }));
  }

  const cookieOpts = adminSessionCookieOptions();

  // API-only response: 200 + JSON body
  const response = withCorrelation(
    NextResponse.json(
      {
        success: true,
      },
      { status: 200 },
    ),
  );

  response.cookies.set({
    name: cookieOpts.name,
    value: "",
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    maxAge: 0,
  });

  logInfo("[POST /api/admin/logout] Admin logout successful, session cookie cleared", {
    host: req.headers.get("host"),
    cookieName: cookieOpts.name,
    correlationId,
  });

  return response;
}
