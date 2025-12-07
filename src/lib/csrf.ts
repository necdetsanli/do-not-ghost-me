// src/lib/csrf.ts
import crypto from "node:crypto";

const CSRF_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const CSRF_TOKEN_VERSION = 1;

type CsrfPayload = {
  v: number; // version
  p: string; // purpose
  iat: number; // issued-at timestamp (ms since epoch)
  n: string; // nonce
  s: string; // signature
};

function getCsrfSecret(): string {
  const raw = process.env.ADMIN_CSRF_SECRET;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_CSRF_SECRET must be set in production.");
  }

  // Safe enough for local dev and tests; never use in production.
  return "dev-only-admin-csrf-secret";
}

function computeSignature(
  secret: string,
  purpose: string,
  issuedAt: number,
  nonce: string,
): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${purpose}:${issuedAt}:${nonce}`);
  return hmac.digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Create a CSRF token bound to a specific purpose (e.g. "admin-login").
 * The token is HMAC-signed and self-contained (no server-side storage).
 */
export function createCsrfToken(purpose: string): string {
  const trimmedPurpose = purpose.trim();
  if (trimmedPurpose.length === 0) {
    throw new Error("CSRF purpose must be a non-empty string.");
  }

  const secret = getCsrfSecret();
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(16).toString("base64url");
  const signature = computeSignature(secret, trimmedPurpose, issuedAt, nonce);

  const payload: CsrfPayload = {
    v: CSRF_TOKEN_VERSION,
    p: trimmedPurpose,
    iat: issuedAt,
    n: nonce,
    s: signature,
  };

  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * Verify a CSRF token for a specific purpose. Returns true if:
 * - token is well-formed,
 * - version and purpose match,
 * - within TTL,
 * - HMAC signature is valid.
 */
export function verifyCsrfToken(
  purpose: string,
  token: string | null,
): boolean {
  if (token === null) {
    return false;
  }

  const trimmedToken = token.trim();
  if (trimmedToken.length === 0) {
    return false;
  }

  try {
    const secret = getCsrfSecret();
    const decodedJson = Buffer.from(trimmedToken, "base64url").toString("utf8");
    const payload = JSON.parse(decodedJson) as CsrfPayload;

    if (payload.v !== CSRF_TOKEN_VERSION) {
      return false;
    }

    const trimmedPurpose = purpose.trim();
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

    const now = Date.now();
    if (now - payload.iat > CSRF_TOKEN_TTL_MS || payload.iat > now) {
      return false;
    }

    const expectedSignature = computeSignature(
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
