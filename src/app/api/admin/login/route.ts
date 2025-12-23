// src/app/api/admin/login/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
  isAllowedAdminHost,
  isOriginAllowed,
} from "@/lib/adminAuth";
import {
  getAdminLoginRateLimiter,
  hashAdminIp,
} from "@/lib/adminLoginRateLimiter";
import { deriveCorrelationId, setCorrelationIdHeader } from "@/lib/correlation";
import { getClientIp } from "@/lib/ip";
import { verifyCsrfToken } from "@/lib/csrf";
import { logWarn, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD_FIELD_NAME = "password";
const CSRF_FIELD_NAME = "_csrf";
const LOGIN_ERROR_QUERY_KEY = "error";
const LOGIN_ERROR_QUERY_VALUE = "1";

// -----------------------------------------------------------------------------
// Origin checks
// -----------------------------------------------------------------------------
/**
 * Builds a 403 JSON response for disallowed admin hosts or origins.
 * This message is relied upon by tests and E2E assertions.
 *
 * @returns {NextResponse} A JSON response with a 403 status.
 */
function buildHostForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Admin access is not allowed from this host.",
    },
    { status: 403 },
  );
}

// -----------------------------------------------------------------------------
// Form parsing / helpers
// -----------------------------------------------------------------------------

/**
 * Extracts the admin login form fields from the request.
 *
 * The function:
 * - reads form data,
 * - trims both password and CSRF token,
 * - returns null for empty or missing fields.
 *
 * @param {NextRequest} req - Incoming Next.js request containing form data.
 * @returns {Promise<{ password: string | null; csrfToken: string | null }>}
 *          Resolved object with normalized password and CSRF token.
 */
async function extractLoginForm(
  req: NextRequest,
): Promise<{ password: string | null; csrfToken: string | null }> {
  const formData = await req.formData();

  const rawPassword = formData.get(ADMIN_PASSWORD_FIELD_NAME);
  const rawCsrf = formData.get(CSRF_FIELD_NAME);

  let password: string | null = null;
  if (typeof rawPassword === "string") {
    const trimmedPassword = rawPassword.trim();
    if (trimmedPassword.length > 0) {
      password = trimmedPassword;
    }
  }

  let csrfToken: string | null = null;
  if (typeof rawCsrf === "string") {
    const trimmedToken = rawCsrf.trim();
    if (trimmedToken.length > 0) {
      csrfToken = trimmedToken;
    }
  }

  return { password, csrfToken };
}

/**
 * Builds a redirect response back to the admin login page with an
 * error query parameter set, so the UI can display a generic error.
 *
 * @param {NextRequest} req - Incoming request used as the URL base.
 * @returns {NextResponse} Redirect response to /admin/login?error=1.
 */
function buildErrorRedirectResponse(req: NextRequest): NextResponse {
  const url = new URL(req.url);
  url.pathname = "/admin/login";
  url.searchParams.set(LOGIN_ERROR_QUERY_KEY, LOGIN_ERROR_QUERY_VALUE);

  return NextResponse.redirect(url, 303);
}

/**
 * Builds a success redirect response to the admin dashboard and attaches
 * a newly created admin session cookie.
 *
 * @param {NextRequest} req - Incoming request used as the URL base.
 * @param {string} sessionToken - Signed admin session token.
 * @returns {NextResponse} Redirect response to /admin with session cookie set.
 */
function buildSuccessRedirectResponse(req: NextRequest, sessionToken: string): NextResponse {
  const url = new URL(req.url);
  url.pathname = "/admin";
  url.search = "";

  const baseResponse = NextResponse.redirect(url, 303);
  return withAdminSessionCookie(baseResponse, sessionToken);
}

/**
 * Builds a JSON response indicating that the admin login rate limit
 * has been exceeded for the current IP address.
 *
 * @returns {NextResponse} A 429 JSON response describing the rate limit.
 */
function buildRateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Too many admin login attempts from this IP. Please try again later.",
    },
    { status: 429 },
  );
}

// -----------------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------------

/**
 * Handles admin login POST requests.
 *
 * Pipeline:
 * 1. Enforce host and Origin restrictions for admin access.
 * 2. Resolve client IP and apply in-memory IP-based login rate limiting.
 * 3. Parse and validate the login form (password + CSRF token).
 * 4. Verify CSRF token for the "admin-login" purpose.
 * 5. Verify the admin password using constant-time comparison.
 * 6. On success, reset rate limit state and create an admin session token.
 * 7. Redirect to /admin with the session cookie attached.
 *
 * Error handling:
 * - Host/Origin failures → 403 JSON.
 * - Rate limit exceeded → 429 JSON.
 * - Invalid CSRF/password/missing fields → redirect back to login with error flag.
 * - Unexpected failures → 500 JSON with a generic error message.
 *
 * @param {NextRequest} req - Incoming admin login request.
 * @returns {Promise<NextResponse>} The HTTP response for the login attempt.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const correlationId = deriveCorrelationId(req);
  const rateLimiter = getAdminLoginRateLimiter();

  const withCorrelation = (res: NextResponse): NextResponse => {
    setCorrelationIdHeader(res, correlationId);
    return res;
  };

  const logCtx = (ctx?: Record<string, unknown>): Record<string, unknown> => ({
    correlationId,
    ...ctx,
  });

  // 1) Host and origin checks (shared host logic with other admin endpoints).
  if (isAllowedAdminHost(req) !== true || isOriginAllowed(req) !== true) {
    logWarn("[POST /api/admin/login] Blocked by host/origin check", logCtx({
      host: req.headers.get("host") ?? null,
      origin: req.headers.get("origin") ?? null,
    }));

    return withCorrelation(buildHostForbiddenResponse());
  }

  // 2) IP-based rate limiting.
  const clientIpRaw = getClientIp(req);
  const clientIp = typeof clientIpRaw === "string" ? clientIpRaw.trim() : "";
  const now = Date.now();

  // Fail closed: missing/blank/unknown IP is not allowed to proceed.
  if (clientIp.length === 0 || clientIp.toLowerCase() === "unknown") {
    return withCorrelation(
      NextResponse.json(
        {
          error: "Bad request",
        },
        { status: 400 },
      ),
    );
  }

  const ipHash = hashAdminIp(clientIp);

  if (clientIp.length > 0) {
    const locked = await rateLimiter.isLocked(ipHash, now);
    if (locked) {
      return withCorrelation(buildRateLimitResponse());
    }
  }

  try {
    // 3) Form extraction.
    const { password, csrfToken } = await extractLoginForm(req);

    // 4) CSRF validation.
    const csrfIsValid = verifyCsrfToken("admin-login", csrfToken);
    if (csrfIsValid !== true) {
      if (clientIp.length > 0) {
        await rateLimiter.registerFailure(ipHash, now);
      }

      return withCorrelation(buildErrorRedirectResponse(req));
    }

    // 5) Password validation.
    if (password === null) {
      if (clientIp.length > 0) {
        await rateLimiter.registerFailure(ipHash, now);
      }

      return withCorrelation(buildErrorRedirectResponse(req));
    }

    const isValidPassword = verifyAdminPassword(password);

    if (isValidPassword !== true) {
      if (clientIp.length > 0) {
        await rateLimiter.registerFailure(ipHash, now);
      }

      return withCorrelation(buildErrorRedirectResponse(req));
    }

    // 6) Successful login → reset rate limit state and create session.
    if (clientIp.length > 0) {
      await rateLimiter.reset(ipHash);
    }

    const sessionToken = createAdminSessionToken();

    return withCorrelation(buildSuccessRedirectResponse(req, sessionToken));
  } catch (error: unknown) {
    logError("[POST /api/admin/login] Unexpected error during admin login", logCtx({
      error,
      ip: clientIp,
    }));

    return withCorrelation(
      NextResponse.json(
        {
          error: "Internal server error",
        },
        { status: 500 },
      ),
    );
  }
}
