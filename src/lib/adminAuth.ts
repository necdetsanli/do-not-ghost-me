import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const ADMIN_SESSION_COOKIE_NAME = "dg_admin";
const ADMIN_SESSION_MAX_AGE_SECONDS =
  process.env.NODE_ENV === "production"
    ? 60 * 60 // 1 hour in production
    : 60 * 30; // 30 minutes in dev/test

export type AdminSessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
};

/**
 * Base64url encode helper.
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
 */
function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64");
}

/**
 * HMAC-SHA256 signer using ADMIN_SESSION_SECRET.
 *
 * Throws if ADMIN_SESSION_SECRET is not configured so that
 * misconfigured admin sessions fail loudly.
 */
function sign(data: string): string {
  if (env.ADMIN_SESSION_SECRET === undefined) {
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
 * Returns true when the password matches, false otherwise.
 */
export function verifyAdminPassword(candidate: string): boolean {
  const configured = env.ADMIN_PASSWORD;

  // If no admin password is configured, never authenticate anyone.
  if (configured === undefined) {
    return false;
  }

  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(configured, "utf8");

  if (a.length !== b.length) {
    // Do a dummy comparison to keep timing roughly consistent.
    try {
      crypto.timingSafeEqual(b, Buffer.alloc(b.length));
    } catch {
      // ignore
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
 * Returns the session payload if:
 * - the signature is valid,
 * - the token is not expired,
 * - the subject is "admin".
 *
 * Returns null for any invalid or malformed token.
 */
export function verifyAdminSessionToken(
  token: string | null | undefined,
): AdminSessionPayload | null {
  if (token === null || token === undefined || token === "") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, sig] = parts;
  if (
    payloadB64 === undefined ||
    payloadB64 === "" ||
    sig === undefined ||
    sig === ""
  ) {
    return null;
  }
  const expectedSig = sign(payloadB64);

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payloadJson = b64urlDecode(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as AdminSessionPayload;

    const now = Math.floor(Date.now() / 1000);

    if (payload.sub !== "admin") {
      return null;
    }

    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns true if this request is allowed to touch the admin surface
 * from a host perspective (based on ADMIN_ALLOWED_HOST).
 *
 * When ADMIN_ALLOWED_HOST is not set or empty, all hosts are allowed.
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
 * Throws on failure to make misuse noisy for call sites.
 */
export function requireAdminRequest(req: NextRequest): AdminSessionPayload {
  if (!isAllowedAdminHost(req)) {
    throw new Error("Admin access is not allowed from this host.");
  }

  const cookieValue = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
  const session = verifyAdminSessionToken(cookieValue);

  if (session === null) {
    throw new Error("Missing or invalid admin session.");
  }

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
 * - Cookie is still HttpOnly, secure (in production) and SameSite=strict.
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
 * Returns the same response object for convenient chaining.
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
