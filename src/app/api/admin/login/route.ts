// src/app/api/admin/login/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
} from "@/lib/adminAuth";
import { env } from "@/env";

const LOGIN_ERROR_QUERY_KEY = "error";
const LOGIN_ERROR_QUERY_VALUE = "1";

/**
 * Checks whether the incoming request host is allowed to use the admin login.
 *
 * ADMIN_ALLOWED_HOST supports a comma-separated list of host:port values,
 * for example:
 *
 *   ADMIN_ALLOWED_HOST="localhost:3000,127.0.0.1:3000"
 *
 * If the env var is missing or empty, this function fails closed.
 */
function isAdminHostAllowed(hostHeader: string | null): boolean {
  if (hostHeader === null) {
    return false;
  }

  const trimmedHost = hostHeader.trim();
  if (trimmedHost === "") {
    return false;
  }

  const allowedRaw = env.ADMIN_ALLOWED_HOST;

  if (allowedRaw === null || allowedRaw === undefined) {
    // Fail closed if configuration is not set.
    return false;
  }

  const allowedTrimmed = allowedRaw.trim();

  if (allowedTrimmed === "") {
    // Fail closed if configuration is not set.
    return false;
  }

  const allowedHosts = allowedTrimmed
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== "");

  const candidate = trimmedHost.toLowerCase();

  return allowedHosts.includes(candidate);
}

/**
 * Extracts the "password" field from the request body.
 *
 * Supports:
 * - application/json (expects { "password": "..." })
 * - application/x-www-form-urlencoded and multipart/form-data
 *
 * Returns the trimmed password string, or null if it is missing/invalid.
 */
async function extractPassword(req: NextRequest): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const jsonBody = (await req.json()) as unknown;

      if (
        jsonBody !== null &&
        typeof jsonBody === "object" &&
        "password" in (jsonBody as Record<string, unknown>)
      ) {
        const candidate = (jsonBody as Record<string, unknown>).password;

        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed !== "") {
            return trimmed;
          }
        }
      }
    } catch {
      // Invalid JSON payload, fall through and treat as missing password.
    }

    return null;
  }

  // Default to form-data / urlencoded handling.
  try {
    const formData = await req.formData();
    const value = formData.get("password");

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") {
        return trimmed;
      }
    }
  } catch {
    // If form parsing fails, fall through and treat as missing password.
  }

  return null;
}

/**
 * Builds a redirect URL back to /admin/login with a generic error flag.
 *
 * We do not leak any information about why the login failed (missing password,
 * wrong password, etc.) to avoid credential enumeration attacks.
 */
function buildErrorRedirectUrl(req: NextRequest): URL {
  const url = new URL("/admin/login", req.nextUrl.origin);
  url.searchParams.set(LOGIN_ERROR_QUERY_KEY, LOGIN_ERROR_QUERY_VALUE);
  return url;
}

/**
 * POST /api/admin/login
 *
 * Handles admin logins from the /admin/login form.
 * On success, redirects to /admin and attaches a signed session cookie.
 * On failure, redirects back to /admin/login?error=1.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const hostHeader = req.headers.get("host");

  // Restrict where admin login is allowed to be called from.
  if (!isAdminHostAllowed(hostHeader)) {
    return NextResponse.json(
      { error: "Admin access is not allowed from this host." },
      { status: 403 },
    );
  }

  const password = await extractPassword(req);

  if (password === null) {
    const redirectUrl = buildErrorRedirectUrl(req);

    return NextResponse.redirect(redirectUrl, {
      status: 303,
    });
  }

  let isValidPassword: boolean;

  try {
    const result = await verifyAdminPassword(password);
    isValidPassword = result === true;
  } catch {
    // Treat verification errors as authentication failure without leaking details.
    isValidPassword = false;
  }

  if (!isValidPassword) {
    const redirectUrl = buildErrorRedirectUrl(req);

    return NextResponse.redirect(redirectUrl, {
      status: 303,
    });
  }

  // At this point the admin is authenticated: issue a session token
  // and attach it to the response via a secure, HttpOnly cookie.
  const sessionToken = createAdminSessionToken();

  const response = NextResponse.redirect(
    new URL("/admin", req.nextUrl.origin),
    {
      status: 303,
    },
  );

  return withAdminSessionCookie(response, sessionToken);
}
