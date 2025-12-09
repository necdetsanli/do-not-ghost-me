// src/app/api/admin/logout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { adminSessionCookieOptions } from "@/lib/adminAuth";
import { logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Return true if this request is allowed to hit the admin logout endpoint,
 * based on the configured ADMIN_ALLOWED_HOST.
 *
 * This mirrors the logic used for the admin login endpoint so that
 * all admin APIs share the same host restriction rules.
 */
function isHostAllowed(req: NextRequest): boolean {
  const allowedHost = env.ADMIN_ALLOWED_HOST;

  if (allowedHost === undefined || allowedHost === null) {
    return true;
  }

  const trimmedAllowed = allowedHost.trim();
  if (trimmedAllowed.length === 0) {
    return true;
  }

  const hostHeader = req.headers.get("host");
  if (hostHeader === null) {
    return false;
  }

  return hostHeader === trimmedAllowed;
}

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
 * Log out the current admin by clearing the session cookie and
 * redirecting back to the login page.
 *
 * This handler is synchronous because it performs no asynchronous work.
 * We still accept the request object to enforce host restrictions.
 */
export function POST(req: NextRequest): NextResponse {
  if (!isHostAllowed(req)) {
    logWarn("[POST /api/admin/logout] Logout blocked due to disallowed host", {
      host: req.headers.get("host"),
      allowedHost: env.ADMIN_ALLOWED_HOST ?? null,
    });

    return buildHostForbiddenResponse();
  }

  const cookieOpts = adminSessionCookieOptions();

  const response = new NextResponse(null, {
    status: 302,
    headers: {
      Location: "/admin/login",
    },
  });

  response.cookies.set({
    name: cookieOpts.name,
    value: "",
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    maxAge: 0,
  });

  logInfo(
    "[POST /api/admin/logout] Admin logout successful, session cookie cleared",
    {
      host: req.headers.get("host"),
      cookieName: cookieOpts.name,
    },
  );

  return response;
}
