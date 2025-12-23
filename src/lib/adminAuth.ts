// src/lib/adminAuth.ts
import type { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import { env } from "@/env";
import { logError, logInfo, logWarn } from "@/lib/logger";

export const ADMIN_SESSION_COOKIE_NAME = "__Host-dg_admin";

/**
 * Session lifetime in seconds.
 * - Production: 1 hour
 * - Non-production (development/test): 30 minutes
 */
const ADMIN_SESSION_MAX_AGE_SECONDS: number = env.NODE_ENV === "production" ? 60 * 60 : 60 * 30;

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
  const remainder: number = str.length % 4;
  const pad: string = remainder === 0 ? "" : "=".repeat(4 - remainder);
  const base64: string = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64");
}

// Track misconfiguration logs so we do not spam on every call.
let hasLoggedMissingSessionSecret = false;
let hasLoggedMissingAdminPassword = false;

/**
 * HMAC-SHA256 signer using ADMIN_SESSION_SECRET.
 *
 * @param data - Arbitrary string to sign.
 * @returns Base64url-encoded HMAC signature.
 *
 * @throws {Error} If ADMIN_SESSION_SECRET is not configured.
 */
function sign(data: string): string {
  if (env.ADMIN_SESSION_SECRET === undefined) {
    if (hasLoggedMissingSessionSecret === false) {
      logError("ADMIN_SESSION_SECRET is not set. Admin sessions are not available.");
      hasLoggedMissingSessionSecret = true;
    }

    throw new Error("ADMIN_SESSION_SECRET is not set. Admin sessions are not available.");
  }

  const hmac = crypto.createHmac("sha256", env.ADMIN_SESSION_SECRET);
  hmac.update(data);
  return b64url(hmac.digest());
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
  const configured: string | undefined = env.ADMIN_PASSWORD;

  // If no admin password is configured, never authenticate anyone.
  if (configured === undefined) {
    if (hasLoggedMissingAdminPassword === false) {
      logError("ADMIN_PASSWORD is not set. Rejecting all admin login attempts.");
      hasLoggedMissingAdminPassword = true;
    }

    return false;
  }

  const candidateBuffer: Buffer = Buffer.from(candidate, "utf8");
  const configuredBuffer: Buffer = Buffer.from(configured, "utf8");

  if (candidateBuffer.length !== configuredBuffer.length) {
    // Do a dummy comparison to keep timing roughly consistent.
    try {
      const dummy: Buffer = Buffer.alloc(configuredBuffer.length);
      // Result is intentionally ignored; this is only to keep timing similar.
      crypto.timingSafeEqual(configuredBuffer, dummy);
    } catch {
      // Intentionally ignored: this is only to keep timing similar.
    }

    return false;
  }

  try {
    const isEqual: boolean = crypto.timingSafeEqual(candidateBuffer, configuredBuffer);
    return isEqual;
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
  const now: number = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS,
  };

  const payloadJson: string = JSON.stringify(payload);
  const payloadB64: string = b64url(payloadJson);
  const signature: string = sign(payloadB64);

  return `${payloadB64}.${signature}`;
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

  const parts: string[] = token.split(".");
  if (parts.length !== 2) {
    logWarn("Received admin session token with invalid format", {
      // Do NOT log the token itself for security reasons.
      tokenLength: token.length,
    });
    return null;
  }

  const [payloadB64, sig] = parts;
  if (payloadB64 === undefined || payloadB64 === "" || sig === undefined || sig === "") {
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
      error: error instanceof Error ? error.message : /** fallback */ String(error),
    });
    return null;
  }

  const sigBuf: Buffer = Buffer.from(sig, "utf8");
  const expectedBuf: Buffer = Buffer.from(expectedSig, "utf8");

  const sameLength: boolean = sigBuf.length === expectedBuf.length;
  const signaturesMatch: boolean =
    sameLength === true && crypto.timingSafeEqual(sigBuf, expectedBuf) === true;

  if (signaturesMatch === false) {
    logWarn("Admin session token signature mismatch", {
      tokenLength: token.length,
    });
    return null;
  }

  try {
    const payloadJson: string = b64urlDecode(payloadB64).toString("utf8");
    const payload: AdminSessionPayload = JSON.parse(payloadJson) as AdminSessionPayload;

    const now: number = Math.floor(Date.now() / 1000);

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
  const requiredHost: string | undefined = env.ADMIN_ALLOWED_HOST;

  if (requiredHost === undefined || requiredHost === "") {
    // No host restriction configured.
    return true;
  }

  const headerHost: string = req.headers.get("host") ?? "";
  return headerHost === requiredHost;
}

/**
 * Returns true if the request origin is allowed for the admin surface.
 *
 * This is a defense-in-depth check against CSRF and cross-site requests.
 *
 * Rules:
 * - If ADMIN_ALLOWED_HOST is not configured, origin checks are disabled (allow all).
 * - For safe methods (GET/HEAD/OPTIONS), missing Origin/Referer is allowed.
 * - For non-safe methods (POST/PUT/PATCH/DELETE), Origin or Referer must match the expected admin origin.
 *
 * Expected admin origin is derived from:
 * - protocol: x-forwarded-proto header when present, otherwise req.nextUrl.protocol
 * - host: ADMIN_ALLOWED_HOST
 *
 * @param req - Incoming NextRequest.
 * @returns True when origin is allowed, false otherwise.
 */
export function isOriginAllowed(req: NextRequest): boolean {
  const requiredHost: string | undefined = env.ADMIN_ALLOWED_HOST;

  if (requiredHost === undefined || requiredHost === "") {
    return true;
  }

  const method: string = req.method;
  const isSafeMethod: boolean = method === "GET" || method === "HEAD" || method === "OPTIONS";

  const protoHeader: string = req.headers.get("x-forwarded-proto") ?? "";
  let proto: string;

  if (protoHeader === "http" || protoHeader === "https") {
    proto = protoHeader;
  } else {
    const raw: string = req.nextUrl.protocol; // "https:" | "http:"
    proto = raw.replace(":", "");
  }

  if (proto !== "http" && proto !== "https") {
    proto = "https";
  }

  const expectedOrigin: string = `${proto}://${requiredHost}`;

  const originHeader: string | null = req.headers.get("origin");
  if (originHeader !== null && originHeader !== "") {
    try {
      const origin: string = new URL(originHeader).origin;
      return origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  const refererHeader: string | null = req.headers.get("referer");
  if (refererHeader !== null && refererHeader !== "") {
    try {
      const refOrigin: string = new URL(refererHeader).origin;
      return refOrigin === expectedOrigin;
    } catch {
      return false;
    }
  }

  if (isSafeMethod === true) {
    return true;
  }

  return false;
}

/**
 * Validate that this request is allowed to reach the admin surface:
 * - passes the host check (ADMIN_ALLOWED_HOST), and
 * - carries a valid admin session cookie.
 *
 * @param req - Incoming NextRequest.
 * @returns Parsed admin session payload when authorized.
 *
 * @throws {Error} If the host is not allowed or the session is missing/invalid.
 */
export function requireAdminRequest(req: NextRequest): AdminSessionPayload {
  const hostAllowed: boolean = isAllowedAdminHost(req);

  if (hostAllowed === false) {
    logWarn("Blocked admin request from disallowed host", {
      host: req.headers.get("host") ?? null,
    });

    throw new Error("Admin access is not allowed from this host.");
  }

  const originAllowed: boolean = isOriginAllowed(req);

  if (originAllowed === false) {
    logWarn("Blocked admin request due to origin/referer mismatch", {
      host: req.headers.get("host") ?? null,
      origin: req.headers.get("origin") ?? null,
      referer: req.headers.get("referer") ?? null,
      method: req.method,
    });

    throw new Error("Admin access is not allowed from this origin.");
  }

  const cookieValue: string | null = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
  const session: AdminSessionPayload | null = verifyAdminSessionToken(cookieValue);

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
  // __Host- prefixed cookies REQUIRE Secure=true, even on localhost.
  // If we set Secure=false, browsers will reject the cookie entirely.
  // Therefore, we always set secure: true for __Host- cookies.
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: true,
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
export function withAdminSessionCookie(res: NextResponse, token: string): NextResponse {
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
