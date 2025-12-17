// tests/unit/csrf.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

const { env } = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test",
    ADMIN_CSRF_SECRET: undefined as string | undefined,
  },
}));

vi.mock("@/env", () => ({
  env,
}));

import { createCsrfToken, verifyCsrfToken } from "@/lib/csrf";

/**
 * Decodes a base64url-encoded CSRF token into its JSON payload.
 *
 * @param token - Base64url-encoded token string.
 * @returns The decoded JSON payload as unknown.
 */
function decodeToken(token: string): unknown {
  const json: string = Buffer.from(token, "base64url").toString("utf8");
  return JSON.parse(json) as unknown;
}

/**
 * Encodes a JSON payload into a base64url-encoded token string.
 *
 * @param payload - JSON-serializable payload.
 * @returns Base64url-encoded token string.
 */
function encodeToken(payload: unknown): string {
  const json: string = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

describe("csrf", () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    env.NODE_ENV = "test";
    env.ADMIN_CSRF_SECRET = undefined;

    randomSpy = vi.spyOn(crypto, "randomBytes").mockImplementation(((
      size: number,
      cb?: (err: Error | null, buf: Buffer) => void,
    ) => {
      const buf: Buffer = Buffer.alloc(size, 7);

      if (typeof cb === "function") {
        cb(null, buf);
        return;
      }

      return buf;
    }) as unknown as typeof crypto.randomBytes);
  });

  afterEach(() => {
    randomSpy.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Ensures CSRF token creation and verification succeed using the
   * dev/test fallback secret when no explicit secret is configured.
   */
  it("creates a token and verifies it (dev/test fallback secret)", () => {
    const token: string = createCsrfToken("admin-login");
    const ok: boolean = verifyCsrfToken("admin-login", token);
    expect(ok).toBe(true);
  });

  /**
   * Ensures purpose strings are trimmed consistently during both token
   * creation and verification, preventing whitespace-related mismatches.
   */
  it("trims purpose on create/verify", () => {
    const token: string = createCsrfToken(
      " admin-login " as unknown as "admin-login",
    );
    const ok: boolean = verifyCsrfToken(
      " admin-login " as unknown as "admin-login",
      token,
    );
    expect(ok).toBe(true);
  });

  /**
   * Ensures token creation fails fast when the purpose is blank after trimming,
   * preventing ambiguous or unsafe usage.
   */
  it("throws when purpose is empty after trim", () => {
    expect(() =>
      createCsrfToken("   " as unknown as "admin-login"),
    ).toThrowError(/CSRF purpose must be a non-empty string/i);
  });

  /**
   * Ensures verification is fail-closed for missing/empty token inputs.
   */
  it("returns false for null / empty tokens", () => {
    expect(verifyCsrfToken("admin-login", null)).toBe(false);
    expect(verifyCsrfToken("admin-login", "")).toBe(false);
    expect(verifyCsrfToken("admin-login", "   ")).toBe(false);
  });

  /**
   * Ensures verification is fail-closed for malformed tokens, including
   * invalid base64url strings and invalid JSON payloads.
   */
  it("returns false for invalid base64 / invalid JSON", () => {
    expect(verifyCsrfToken("admin-login", "not-a-valid-token")).toBe(false);

    const token: string = Buffer.from("not-json", "utf8").toString("base64url");
    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  /**
   * Ensures a token is rejected if its version field is tampered with,
   * preventing acceptance of unknown/unsupported token formats.
   */
  it("returns false when version mismatches", () => {
    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;
    payload.v = 999;

    const tampered: string = encodeToken(payload);
    expect(verifyCsrfToken("admin-login", tampered)).toBe(false);
  });

  /**
   * Ensures a token is bound to its intended purpose and cannot be replayed
   * for a different purpose.
   */
  it("returns false when purpose mismatches", () => {
    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;
    payload.p = "something-else";

    const tampered: string = encodeToken(payload);
    expect(verifyCsrfToken("admin-login", tampered)).toBe(false);
  });

  /**
   * Ensures verification rejects payloads that do not match the expected shape
   * (types and required fields), even when base64/json decoding succeeds.
   */
  it("returns false when payload shape is invalid", () => {
    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;

    payload.iat = "nope";
    expect(verifyCsrfToken("admin-login", encodeToken(payload))).toBe(false);

    const payload2 = decodeToken(token) as Record<string, unknown>;
    delete payload2.n;
    expect(verifyCsrfToken("admin-login", encodeToken(payload2))).toBe(false);

    const payload3 = decodeToken(token) as Record<string, unknown>;
    delete payload3.s;
    expect(verifyCsrfToken("admin-login", encodeToken(payload3))).toBe(false);
  });

  /**
   * Ensures tokens expire after the configured TTL and are rejected after expiry.
   */
  it("returns false for expired tokens", () => {
    const token: string = createCsrfToken("admin-login");

    const oneHourMs: number = 60 * 60 * 1000;
    vi.setSystemTime(new Date(Date.now() + oneHourMs + 1));

    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  /**
   * Ensures verification is fail-closed for tokens whose iat is not consistent
   * with the current clock (iat in the future).
   */
  it("returns false when iat is in the future", () => {
    const token: string = createCsrfToken("admin-login");
    vi.setSystemTime(new Date(Date.now() - 1));
    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  /**
   * Ensures signature comparison rejects tampering even when the signature
   * length is unchanged (constant-time compare safety path).
   */
  it("returns false when signature mismatches (same length)", () => {
    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;

    const sig: string = String(payload.s ?? "");
    const first: string = sig.length > 0 ? sig.charAt(0) : "a";
    const flipped: string = first === "a" ? "b" : "a";
    payload.s = `${flipped}${sig.slice(1)}`;

    expect(verifyCsrfToken("admin-login", encodeToken(payload))).toBe(false);
  });

  /**
   * Ensures signature comparison rejects tampering when the signature length
   * differs from the expected signature length.
   */
  it("returns false when signature mismatches (different length)", () => {
    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;

    payload.s = "short";

    expect(verifyCsrfToken("admin-login", encodeToken(payload))).toBe(false);
  });

  /**
   * Ensures the configured secret is used when present and that tokens become
   * invalid if the secret changes (rotation invalidates old tokens).
   */
  it("uses configured secret when ADMIN_CSRF_SECRET is set (and fails if secret changes)", () => {
    env.ADMIN_CSRF_SECRET = "secret-a";

    const token: string = createCsrfToken("admin-login");
    expect(verifyCsrfToken("admin-login", token)).toBe(true);

    env.ADMIN_CSRF_SECRET = "secret-b";
    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  /**
   * Ensures production mode fails closed when the secret is missing:
   * - create must throw (misconfiguration)
   * - verify must return false
   */
  it("in production, create throws if ADMIN_CSRF_SECRET is missing; verify returns false", () => {
    env.NODE_ENV = "production";
    env.ADMIN_CSRF_SECRET = undefined;

    expect(() => createCsrfToken("admin-login")).toThrowError(
      /ADMIN_CSRF_SECRET must be set in production/i,
    );

    const someToken: string = Buffer.from("{}", "utf8").toString("base64url");
    expect(verifyCsrfToken("admin-login", someToken)).toBe(false);
  });
});
