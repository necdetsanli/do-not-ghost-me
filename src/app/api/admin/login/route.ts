// src/app/api/admin/login/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
  isAllowedAdminHost,
} from "@/lib/adminAuth";
import { getClientIp } from "@/lib/ip";
import { verifyCsrfToken } from "@/lib/csrf";
import { logWarn, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD_FIELD_NAME = "password";
const CSRF_FIELD_NAME = "_csrf";
const LOGIN_ERROR_QUERY_KEY = "error";
const LOGIN_ERROR_QUERY_VALUE = "1";

// -----------------------------------------------------------------------------
// Login rate limiting (in-memory, IP-based)
// -----------------------------------------------------------------------------

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS: number = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS: number = 5 * 60 * 1000; // 5 minutes
const LOGIN_RATE_LIMIT_LOCK_MS: number = 15 * 60 * 1000; // 15 minutes

type LoginRateLimitState = {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
};

type LoginRateLimitStore = Map<string, LoginRateLimitState>;

/**
 * Returns the global in-memory store for admin login rate limiting.
 *
 * The store is attached to `globalThis` so that it survives hot reloads
 * in development and avoids re-creating the map on every import.
 *
 * @returns {LoginRateLimitStore} The shared rate limit store.
 */
function getLoginRateLimitStore(): LoginRateLimitStore {
  const globalAny = globalThis as {
    __adminLoginRateLimitStore?: LoginRateLimitStore;
  };

  globalAny.__adminLoginRateLimitStore ??= new Map<string, LoginRateLimitState>();

  return globalAny.__adminLoginRateLimitStore;
}

/**
 * Retrieves or initializes the rate limit state for a given IP address.
 *
 * If an existing state is found and its lock has expired, the state is reset.
 * Otherwise, the existing state is returned as-is. New IPs receive an initial
 * state with zero attempts and no lock.
 *
 * @param {string} ip - The client IP address.
 * @param {number} now - The current timestamp in milliseconds.
 * @returns {LoginRateLimitState} The rate limit state for the IP.
 */
function getRateLimitStateForIp(ip: string, now: number): LoginRateLimitState {
  const store = getLoginRateLimitStore();
  const existing = store.get(ip);

  if (existing !== undefined) {
    if (existing.lockedUntil !== null && now >= existing.lockedUntil) {
      const resetState: LoginRateLimitState = {
        attempts: 0,
        firstAttemptAt: now,
        lockedUntil: null,
      };

      store.set(ip, resetState);
      return resetState;
    }

    return existing;
  }

  const initial: LoginRateLimitState = {
    attempts: 0,
    firstAttemptAt: now,
    lockedUntil: null,
  };

  store.set(ip, initial);
  return initial;
}

/**
 * Returns true if the given IP address is currently locked out
 * due to too many failed login attempts.
 *
 * @param {string} ip - The client IP address.
 * @param {number} now - The current timestamp in milliseconds.
 * @returns {boolean} True if the IP is locked, false otherwise.
 */
function isIpLocked(ip: string, now: number): boolean {
  const state = getRateLimitStateForIp(ip, now);

  if (state.lockedUntil === null) {
    return false;
  }

  return now < state.lockedUntil;
}

/**
 * Registers a failed login attempt for an IP address, updating its
 * rate limit state and applying a temporary lock if the maximum number
 * of attempts within the window is exceeded.
 *
 * @param {string} ip - The client IP address.
 * @param {number} now - The current timestamp in milliseconds.
 * @returns {void}
 */
function registerFailedLoginAttempt(ip: string, now: number): void {
  const store = getLoginRateLimitStore();
  const state = getRateLimitStateForIp(ip, now);

  // If the first attempt is outside the window, reset the counter.
  if (now - state.firstAttemptAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    state.attempts = 0;
    state.firstAttemptAt = now;
    state.lockedUntil = null;
  }

  state.attempts += 1;

  if (state.attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    state.lockedUntil = now + LOGIN_RATE_LIMIT_LOCK_MS;

    logWarn("[admin-login] IP locked due to too many failed attempts", {
      ip,
      attempts: state.attempts,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
      lockMs: LOGIN_RATE_LIMIT_LOCK_MS,
      lockedUntil: state.lockedUntil,
    });
  }

  store.set(ip, state);
}

/**
 * Clears all rate limit tracking state for the given IP address.
 * This is typically called after a successful login.
 *
 * @param {string} ip - The client IP address.
 * @returns {void}
 */
function resetLoginAttempts(ip: string): void {
  const store = getLoginRateLimitStore();
  store.delete(ip);
}

// -----------------------------------------------------------------------------
// Origin checks
// -----------------------------------------------------------------------------

/**
 * Basic Origin check for CSRF mitigation.
 *
 * If an Origin header is present, its host must match:
 * - ADMIN_ALLOWED_HOST when configured, otherwise
 * - the Host header of the current request.
 *
 * @param {NextRequest} req - Incoming Next.js request.
 * @returns {boolean} True if the Origin is allowed, false otherwise.
 */
function isOriginAllowed(req: NextRequest): boolean {
  const originHeader = req.headers.get("origin");

  if (originHeader === null) {
    return true;
  }

  let originUrl: URL;
  try {
    originUrl = new URL(originHeader);
  } catch {
    return false;
  }

  const allowedHostFromEnv = env.ADMIN_ALLOWED_HOST;
  const hostHeader = req.headers.get("host");

  const normalizedOriginHost = originUrl.host;
  const normalizedAllowed =
    allowedHostFromEnv !== undefined && allowedHostFromEnv !== null
      ? allowedHostFromEnv.trim()
      : "";

  if (normalizedAllowed.length > 0) {
    return normalizedOriginHost === normalizedAllowed;
  }

  if (hostHeader === null) {
    return false;
  }

  return normalizedOriginHost === hostHeader;
}

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
  // 1) Host and origin checks (shared host logic with other admin endpoints).
  if (isAllowedAdminHost(req) !== true || isOriginAllowed(req) !== true) {
    logWarn("[POST /api/admin/login] Blocked by host/origin check", {
      host: req.headers.get("host") ?? null,
      origin: req.headers.get("origin") ?? null,
    });

    return buildHostForbiddenResponse();
  }

  // 2) IP-based rate limiting.
  const clientIpRaw = getClientIp(req);
  const clientIp = typeof clientIpRaw === "string" ? clientIpRaw.trim() : "";
  const now = Date.now();

  if (clientIp.length > 0 && isIpLocked(clientIp, now) === true) {
    return buildRateLimitResponse();
  }

  try {
    // 3) Form extraction.
    const { password, csrfToken } = await extractLoginForm(req);

    // 4) CSRF validation.
    const csrfIsValid = verifyCsrfToken("admin-login", csrfToken);
    if (csrfIsValid !== true) {
      if (clientIp.length > 0) {
        registerFailedLoginAttempt(clientIp, now);
      }

      return buildErrorRedirectResponse(req);
    }

    // 5) Password validation.
    if (password === null) {
      if (clientIp.length > 0) {
        registerFailedLoginAttempt(clientIp, now);
      }

      return buildErrorRedirectResponse(req);
    }

    const isValidPassword = verifyAdminPassword(password);

    if (isValidPassword !== true) {
      if (clientIp.length > 0) {
        registerFailedLoginAttempt(clientIp, now);
      }

      return buildErrorRedirectResponse(req);
    }

    // 6) Successful login → reset rate limit state and create session.
    if (clientIp.length > 0) {
      resetLoginAttempts(clientIp);
    }

    const sessionToken = createAdminSessionToken();

    return buildSuccessRedirectResponse(req, sessionToken);
  } catch (error: unknown) {
    logError("[POST /api/admin/login] Unexpected error during admin login", {
      error,
      ip: clientIp,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
