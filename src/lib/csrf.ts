// src/lib/csrf.ts
import crypto from "node:crypto";
import { env } from "@/env";

/**
 * Time-to-live for CSRF tokens in milliseconds.
 * Tokens older than this value are considered expired.
 */
const CSRF_TOKEN_TTL_MS: number = 60 * 60 * 1000; // 1 hour

/**
 * Version number for the CSRF token payload structure.
 * Bump this when changing the payload shape in an incompatible way.
 */
const CSRF_TOKEN_VERSION = 1;

/**
 * Allowed CSRF token purposes.
 *
 * Keeping this as a string literal union makes call sites explicit and
 * avoids accidental reuse of the same secret for unrelated contexts.
 */
export type CsrfPurpose = "admin-login";

/**
 * Internal CSRF token payload shape.
 *
 * Notes:
 * - `v` is the schema version. Bump this if you change the structure.
 * - `p` is the purpose (e.g. "admin-login").
 * - `iat` is milliseconds since epoch.
 * - `n` is a random nonce.
 * - `s` is the HMAC-SHA256 signature in base64url form.
 */
type CsrfPayload = {
  v: number;
  p: CsrfPurpose;
  iat: number;
  n: string;
  s: string;
};

/**
 * Resolve the CSRF secret used to sign tokens.
 *
 * Precedence:
 * - If `ADMIN_CSRF_SECRET` is configured (via env.ts), use that.
 * - In production, this must be set; otherwise an error is thrown.
 * - In development / test, fall back to a fixed dev-only secret.
 *
 * @returns The secret string used to sign and verify CSRF tokens.
 *
 * @throws {Error} When running in production without a configured ADMIN_CSRF_SECRET.
 */
function getCsrfSecret(): string {
  const configuredRaw: string | undefined = env.ADMIN_CSRF_SECRET;
  const configured: string =
    configuredRaw !== undefined ? configuredRaw.trim() : "";

  if (configured.length > 0) {
    return configured;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("ADMIN_CSRF_SECRET must be set in production.");
  }

  // Safe enough for local dev and tests; NEVER use in production.
  return "dev-only-admin-csrf-secret";
}

/**
 * Compute an HMAC-SHA256 signature for a CSRF payload tuple.
 *
 * @param secret - HMAC secret key.
 * @param purpose - CSRF purpose.
 * @param issuedAt - Issued-at timestamp (ms since epoch).
 * @param nonce - Random nonce.
 * @returns Base64url-encoded signature string.
 */
function computeSignature(
  secret: string,
  purpose: CsrfPurpose,
  issuedAt: number,
  nonce: string,
): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${purpose}:${issuedAt}:${nonce}`);
  return hmac.digest("base64url");
}

/**
 * Timing-safe string comparison helper.
 *
 * If lengths differ, we still perform a dummy comparison on a padded buffer
 * to keep the timing behaviour closer, then return false.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns True if the strings are equal, false otherwise.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer: Buffer = Buffer.from(a, "utf8");
  const bBuffer: Buffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    // Perform a dummy comparison to avoid obvious timing differences.
    const maxLen: number = Math.max(aBuffer.length, bBuffer.length);
    const paddedA: Buffer = Buffer.alloc(maxLen);
    const paddedB: Buffer = Buffer.alloc(maxLen);

    aBuffer.copy(paddedA);
    bBuffer.copy(paddedB);

    try {
      // Result intentionally ignored; this is purely for timing noise.
      crypto.timingSafeEqual(paddedA, paddedB);
    } catch {
      // Ignore errors here; this is purely for timing noise.
    }

    return false;
  }

  try {
    const isEqual: boolean = crypto.timingSafeEqual(aBuffer, bBuffer);
    return isEqual;
  } catch {
    return false;
  }
}

/**
 * Create a CSRF token bound to a specific purpose (for example "admin-login").
 *
 * The token is:
 * - self-contained (no server-side storage),
 * - HMAC-signed with a secret,
 * - versioned via `CSRF_TOKEN_VERSION`,
 * - time-limited via `CSRF_TOKEN_TTL_MS`.
 *
 * @param purpose - The logical purpose of the token.
 * @returns A base64url-encoded CSRF token string.
 *
 * @throws {Error} When the provided purpose is an empty string after trimming.
 */
export function createCsrfToken(purpose: CsrfPurpose): string {
  const trimmedPurpose: CsrfPurpose = purpose.trim() as CsrfPurpose;

  if (trimmedPurpose.length === 0) {
    throw new Error("CSRF purpose must be a non-empty string.");
  }

  const secret: string = getCsrfSecret();
  const issuedAt: number = Date.now();
  const nonce: string = crypto.randomBytes(16).toString("base64url");
  const signature: string = computeSignature(
    secret,
    trimmedPurpose,
    issuedAt,
    nonce,
  );

  const payload: CsrfPayload = {
    v: CSRF_TOKEN_VERSION,
    p: trimmedPurpose,
    iat: issuedAt,
    n: nonce,
    s: signature,
  };

  const json: string = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * Verify a CSRF token for a specific purpose.
 *
 * Returns true if and only if:
 * - token is non-empty and decodes as JSON,
 * - version matches `CSRF_TOKEN_VERSION`,
 * - purpose matches the expected purpose,
 * - structure is valid,
 * - token is within the configured TTL,
 * - HMAC signature matches the expected value.
 *
 * @param purpose - Expected CSRF purpose.
 * @param token - Raw token string from the client (may be null).
 * @returns True when the token is valid, false otherwise.
 */
export function verifyCsrfToken(
  purpose: CsrfPurpose,
  token: string | null,
): boolean {
  if (token === null) {
    return false;
  }

  const trimmedToken: string = token.trim();
  if (trimmedToken.length === 0) {
    return false;
  }

  try {
    const secret: string = getCsrfSecret();
    const decodedJson: string = Buffer.from(trimmedToken, "base64url").toString(
      "utf8",
    );
    const payload = JSON.parse(decodedJson) as Partial<CsrfPayload>;

    if (payload.v !== CSRF_TOKEN_VERSION) {
      return false;
    }

    const trimmedPurpose: CsrfPurpose = purpose.trim() as CsrfPurpose;
    if (payload.p !== trimmedPurpose) {
      return false;
    }

    if (
      typeof payload.iat !== "number" ||
      typeof payload.n !== "string" ||
      typeof payload.s !== "string"
    ) {
      return false;
    }

    const now: number = Date.now();
    const isExpired: boolean =
      now - payload.iat > CSRF_TOKEN_TTL_MS || payload.iat > now;

    if (isExpired === true) {
      return false;
    }

    const expectedSignature: string = computeSignature(
      secret,
      payload.p,
      payload.iat,
      payload.n,
    );

    return timingSafeEqual(payload.s, expectedSignature);
  } catch {
    return false;
  }
}
