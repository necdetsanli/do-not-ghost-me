// src/app/api/admin/login/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
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

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_RATE_LIMIT_LOCK_MS = 15 * 60 * 1000; // 15 minutes

type LoginRateLimitState = {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
};

type LoginRateLimitStore = Map<string, LoginRateLimitState>;

function getLoginRateLimitStore(): LoginRateLimitStore {
  const globalAny = globalThis as {
    __adminLoginRateLimitStore?: LoginRateLimitStore;
  };

  if (globalAny.__adminLoginRateLimitStore === undefined) {
    globalAny.__adminLoginRateLimitStore = new Map<
      string,
      LoginRateLimitState
    >();
  }

  return globalAny.__adminLoginRateLimitStore;
}

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

function isIpLocked(ip: string, now: number): boolean {
  const state = getRateLimitStateForIp(ip, now);

  if (state.lockedUntil === null) {
    return false;
  }

  return now < state.lockedUntil;
}

function registerFailedLoginAttempt(ip: string, now: number): void {
  const store = getLoginRateLimitStore();
  const state = getRateLimitStateForIp(ip, now);

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

function resetLoginAttempts(ip: string): void {
  const store = getLoginRateLimitStore();
  store.delete(ip);
}

// -----------------------------------------------------------------------------
// Host / origin checks
// -----------------------------------------------------------------------------

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
 * Basic Origin check for CSRF mitigation.
 *
 * If an Origin header is present, its host must match the allowed host
 * (or the Host header when ADMIN_ALLOWED_HOST is not set).
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
 * 403 JSON response for disallowed admin hosts or origins.
 * This message is relied upon by tests and E2E assertions.
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

function buildErrorRedirectResponse(req: NextRequest): NextResponse {
  const url = new URL(req.url);
  url.pathname = "/admin/login";
  url.searchParams.set(LOGIN_ERROR_QUERY_KEY, LOGIN_ERROR_QUERY_VALUE);

  return NextResponse.redirect(url);
}

function buildSuccessRedirectResponse(
  req: NextRequest,
  sessionToken: string,
): NextResponse {
  const url = new URL(req.url);
  url.pathname = "/admin";
  url.search = "";

  const baseResponse = NextResponse.redirect(url);
  return withAdminSessionCookie(baseResponse, sessionToken);
}

function buildRateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Too many admin login attempts from this IP. Please try again later.",
    },
    { status: 429 },
  );
}

// -----------------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isHostAllowed(req) || !isOriginAllowed(req)) {
    logWarn("[POST /api/admin/login] Blocked by host/origin check", {
      host: req.headers.get("host") ?? null,
      origin: req.headers.get("origin") ?? null,
    });

    return buildHostForbiddenResponse();
  }

  const clientIpRaw = getClientIp(req);
  const clientIp = typeof clientIpRaw === "string" ? clientIpRaw.trim() : "";
  const now = Date.now();

  if (clientIp.length > 0 && isIpLocked(clientIp, now)) {
    return buildRateLimitResponse();
  }

  try {
    const { password, csrfToken } = await extractLoginForm(req);

    const csrfIsValid = verifyCsrfToken("admin-login", csrfToken);
    if (csrfIsValid !== true) {
      if (clientIp.length > 0) {
        registerFailedLoginAttempt(clientIp, now);
      }

      return buildErrorRedirectResponse(req);
    }

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
