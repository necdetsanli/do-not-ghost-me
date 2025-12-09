// src/lib/adminAuth.ts
import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import { logInfo, logWarn, logError } from "@/lib/logger";

export const ADMIN_SESSION_COOKIE_NAME = "dg_admin";

/**
 * Session lifetime in seconds.
 * - Production: 1 hour
 * - Non-production (development/test): 30 minutes
 */
const ADMIN_SESSION_MAX_AGE_SECONDS: number =
  env.NODE_ENV === "production" ? 60 * 60 : 60 * 30;

/**
 * Minimal payload carried inside an admin session token.
 */
export type AdminSessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
};

/**
 * Base64url encode helper.
 *
 * @param input - Raw string or buffer to encode.
 * @returns Base64url-encoded representation (URL-safe, no padding).
 */
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Base64url decode helper.
 *
 * @param str - Base64url-encoded string.
 * @returns Decoded buffer.
 */
function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64");
}

// Track misconfiguration logs so we don't spam on every call.
let hasLoggedMissingSessionSecret = false;
let hasLoggedMissingAdminPassword = false;

/**
 * HMAC-SHA256 signer using ADMIN_SESSION_SECRET.
 *
 * @param data - Arbitrary string to sign.
 * @returns Base64url-encoded HMAC signature.
 *
 * @throws If ADMIN_SESSION_SECRET is not configured.
 */
function sign(data: string): string {
  if (env.ADMIN_SESSION_SECRET === undefined) {
    if (!hasLoggedMissingSessionSecret) {
      logError(
        "ADMIN_SESSION_SECRET is not set. Admin sessions are not available.",
      );
      hasLoggedMissingSessionSecret = true;
    }

    throw new Error(
      "ADMIN_SESSION_SECRET is not set. Admin sessions are not available.",
    );
  }

  const h = crypto.createHmac("sha256", env.ADMIN_SESSION_SECRET);
  h.update(data);
  return b64url(h.digest());
}

/**
 * Verify the admin password supplied in the login form against
 * the configured ADMIN_PASSWORD value using a constant-time
 * comparison to avoid timing side channels.
 *
 * @param candidate - User-supplied password from the login form.
 * @returns True when the password matches, false otherwise.
 */
export function verifyAdminPassword(candidate: string): boolean {
  const configured = env.ADMIN_PASSWORD;

  // If no admin password is configured, never authenticate anyone.
  if (configured === undefined) {
    if (!hasLoggedMissingAdminPassword) {
      logError(
        "ADMIN_PASSWORD is not set. Rejecting all admin login attempts.",
      );
      hasLoggedMissingAdminPassword = true;
    }

    return false;
  }

  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(configured, "utf8");

  if (a.length !== b.length) {
    // Do a dummy comparison to keep timing roughly consistent.
    try {
      crypto.timingSafeEqual(b, Buffer.alloc(b.length));
    } catch {
      // Intentionally ignored: this is only to keep timing similar.
    }

    return false;
  }

  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Create a signed admin session token containing:
 * - sub: fixed "admin" subject
 * - iat: issued-at timestamp (seconds)
 * - exp: expiration timestamp (seconds)
 *
 * @returns Opaque signed session token.
 */
export function createAdminSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64url(payloadJson);
  const sig = sign(payloadB64);

  return `${payloadB64}.${sig}`;
}

/**
 * Verify a signed admin session token.
 *
 * @param token - Raw token string from the cookie.
 * @returns Parsed payload when valid, or null when invalid/expired/malformed.
 */
export function verifyAdminSessionToken(
  token: string | null | undefined,
): AdminSessionPayload | null {
  if (token === null || token === undefined || token === "") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    logWarn("Received admin session token with invalid format", {
      // Do NOT log the token itself for security reasons.
      tokenLength: token.length,
    });
    return null;
  }

  const [payloadB64, sig] = parts;
  if (
    payloadB64 === undefined ||
    payloadB64 === "" ||
    sig === undefined ||
    sig === ""
  ) {
    logWarn("Received admin session token with empty payload or signature", {
      tokenLength: token.length,
    });
    return null;
  }

  let expectedSig: string;
  try {
    expectedSig = sign(payloadB64);
  } catch (error) {
    // Misconfiguration (e.g. missing secret) is already logged in sign().
    logError("Failed to compute expected signature for admin session token", {
      error:
        error instanceof Error ? error.message : /** fallback */ String(error),
    });
    return null;
  }

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    logWarn("Admin session token signature mismatch", {
      tokenLength: token.length,
    });
    return null;
  }

  try {
    const payloadJson = b64urlDecode(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as AdminSessionPayload;

    const now = Math.floor(Date.now() / 1000);

    if (payload.sub !== "admin") {
      logWarn("Admin session token has invalid subject", {
        sub: payload.sub,
      });
      return null;
    }

    if (payload.exp < now) {
      logWarn("Admin session token has expired", {
        exp: payload.exp,
        now,
      });
      return null;
    }

    return payload;
  } catch (error) {
    logWarn("Failed to decode or parse admin session token payload", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Returns true if this request is allowed to touch the admin surface
 * from a host perspective (based on ADMIN_ALLOWED_HOST).
 *
 * When ADMIN_ALLOWED_HOST is not set or empty, all hosts are allowed.
 *
 * @param req - Incoming NextRequest.
 * @returns True when the host is allowed, false otherwise.
 */
export function isAllowedAdminHost(req: NextRequest): boolean {
  const requiredHost = env.ADMIN_ALLOWED_HOST;

  if (requiredHost === undefined || requiredHost === "") {
    // No host restriction configured.
    return true;
  }

  const headerHost = req.headers.get("host") ?? "";
  return headerHost === requiredHost;
}

/**
 * Validate that this request is allowed to reach the admin surface:
 * - passes the host check (ADMIN_ALLOWED_HOST), and
 * - carries a valid admin session cookie.
 *
 * @param req - Incoming NextRequest.
 * @returns Parsed admin session payload when authorized.
 *
 * @throws If the host is not allowed or the session is missing/invalid.
 */
export function requireAdminRequest(req: NextRequest): AdminSessionPayload {
  if (!isAllowedAdminHost(req)) {
    logWarn("Blocked admin request from disallowed host", {
      host: req.headers.get("host") ?? null,
    });

    throw new Error("Admin access is not allowed from this host.");
  }

  const cookieValue = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
  const session = verifyAdminSessionToken(cookieValue);

  if (session === null) {
    logWarn("Blocked admin request with missing or invalid session", {
      host: req.headers.get("host") ?? null,
      hasCookie: cookieValue !== null,
    });

    throw new Error("Missing or invalid admin session.");
  }

  logInfo("Admin request authorized", {
    host: req.headers.get("host") ?? null,
  });

  return session;
}

/**
 * Common cookie options for admin session.
 *
 * Note:
 * - `path` is set to "/" so that both:
 *     - /admin (dashboard pages)
 *     - /api/admin/* (admin API routes)
 *   receive the cookie.
 * - Cookie is HttpOnly, secure (in production) and SameSite=strict.
 *
 * @returns Standardized options for the admin session cookie.
 */
export function adminSessionCookieOptions(): {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict";
  path: string;
  maxAge: number;
} {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Attach an admin session cookie to an existing NextResponse.
 *
 * @param res - Response object to mutate.
 * @param token - Signed admin session token to store in the cookie.
 * @returns The same response instance for fluent chaining.
 */
export function withAdminSessionCookie(
  res: NextResponse,
  token: string,
): NextResponse {
  const opts = adminSessionCookieOptions();

  res.cookies.set({
    name: opts.name,
    value: token,
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });

  return res;
}
