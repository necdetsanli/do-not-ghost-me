// src/app/api/admin/logout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { adminSessionCookieOptions, isAllowedAdminHost } from "@/lib/adminAuth";
import { logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * 403 JSON response for disallowed admin hosts.
 * Kept aligned with the login route for consistent debugging and tests.
 */
function buildHostForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Admin access is not allowed from this host.",
    },
    { status: 403 },
  );
}

/**
 * Log out the current admin by clearing the session cookie.
 *
 * This endpoint is API-only:
 * - It no longer performs any redirects.
 * - Clients are responsible for navigation after a successful logout.
 */
export function POST(req: NextRequest): NextResponse {
  if (!isAllowedAdminHost(req)) {
    logWarn("[POST /api/admin/logout] Logout blocked due to disallowed host", {
      host: req.headers.get("host"),
      allowedHost: env.ADMIN_ALLOWED_HOST ?? null,
    });

    return buildHostForbiddenResponse();
  }

  const cookieOpts = adminSessionCookieOptions();

  // API-only response: 200 + JSON body
  const response = NextResponse.json(
    {
      success: true,
    },
    { status: 200 },
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
  });

  return response;
}
