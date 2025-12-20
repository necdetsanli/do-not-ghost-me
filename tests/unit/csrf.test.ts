// tests/unit/csrf.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

const { env } = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test" as "test" | "production" | "development",
    ADMIN_CSRF_SECRET: undefined as string | undefined,
  },
}));

vi.mock("@/env", () => ({
  env,
}));

/**
 * Imports CSRF helpers with a fresh module graph.
 * The csrf module may snapshot env at import time, so tests must reload it
 * after mutating env to avoid stale configuration.
 *
 * @returns CSRF helper functions.
 */
async function loadCsrf(): Promise<{
  createCsrfToken: (purpose: string) => string;
  verifyCsrfToken: (purpose: string, token: string | null) => boolean;
}> {
  vi.resetModules();
  const mod = await import("@/lib/csrf");

  return {
    createCsrfToken: mod.createCsrfToken as (purpose: string) => string,
    verifyCsrfToken: mod.verifyCsrfToken as (purpose: string, token: string | null) => boolean,
  };
}

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
    vi.resetModules();
  });

  it("creates a token and verifies it (dev/test fallback secret)", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");
    const ok: boolean = verifyCsrfToken("admin-login", token);
    expect(ok).toBe(true);
  });

  it("trims purpose on create/verify", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken(" admin-login " as unknown as "admin-login");
    const ok: boolean = verifyCsrfToken(" admin-login " as unknown as "admin-login", token);
    expect(ok).toBe(true);
  });

  it("throws when purpose is empty after trim", async () => {
    const { createCsrfToken } = await loadCsrf();

    expect(() => createCsrfToken("   " as unknown as "admin-login")).toThrowError(
      /CSRF purpose must be a non-empty string/i,
    );
  });

  it("returns false for null / empty tokens", async () => {
    const { verifyCsrfToken } = await loadCsrf();

    expect(verifyCsrfToken("admin-login", null)).toBe(false);
    expect(verifyCsrfToken("admin-login", "")).toBe(false);
    expect(verifyCsrfToken("admin-login", "   ")).toBe(false);
  });

  it("returns false for invalid base64 / invalid JSON", async () => {
    const { verifyCsrfToken } = await loadCsrf();

    expect(verifyCsrfToken("admin-login", "not-a-valid-token")).toBe(false);

    const token: string = Buffer.from("not-json", "utf8").toString("base64url");
    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  it("returns false when version mismatches", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;
    payload.v = 999;

    const tampered: string = encodeToken(payload);
    expect(verifyCsrfToken("admin-login", tampered)).toBe(false);
  });

  it("returns false when purpose mismatches", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;
    payload.p = "something-else";

    const tampered: string = encodeToken(payload);
    expect(verifyCsrfToken("admin-login", tampered)).toBe(false);
  });

  it("returns false when payload shape is invalid", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

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

  it("returns false for expired tokens", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");

    const oneHourMs: number = 60 * 60 * 1000;
    vi.setSystemTime(new Date(Date.now() + oneHourMs + 1));

    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  it("returns false when iat is in the future", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");

    // Move clock back so token's iat is now in the future relative to "now".
    vi.setSystemTime(new Date(Date.now() - 1));

    expect(verifyCsrfToken("admin-login", token)).toBe(false);
  });

  it("returns false when signature mismatches (same length)", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;

    const sig: string = String(payload.s ?? "");
    const first: string = sig.length > 0 ? sig.charAt(0) : "a";
    const flipped: string = first === "a" ? "b" : "a";
    payload.s = `${flipped}${sig.slice(1)}`;

    expect(verifyCsrfToken("admin-login", encodeToken(payload))).toBe(false);
  });

  it("returns false when signature mismatches (different length)", async () => {
    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    const token: string = createCsrfToken("admin-login");
    const payload = decodeToken(token) as Record<string, unknown>;

    payload.s = "short";

    expect(verifyCsrfToken("admin-login", encodeToken(payload))).toBe(false);
  });

  it("uses configured secret when ADMIN_CSRF_SECRET is set (and fails if secret changes)", async () => {
    env.ADMIN_CSRF_SECRET = "secret-a";

    // Import AFTER setting secret-a so module snapshots the right secret.
    const csrfA = await loadCsrf();

    const token: string = csrfA.createCsrfToken("admin-login");
    expect(csrfA.verifyCsrfToken("admin-login", token)).toBe(true);

    // Rotate secret, then re-import to pick up new config.
    env.ADMIN_CSRF_SECRET = "secret-b";
    const csrfB = await loadCsrf();

    expect(csrfB.verifyCsrfToken("admin-login", token)).toBe(false);
  });

  it("in production, create throws if ADMIN_CSRF_SECRET is missing; verify returns false", async () => {
    env.NODE_ENV = "production";
    env.ADMIN_CSRF_SECRET = undefined;

    const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

    expect(() => createCsrfToken("admin-login")).toThrowError(
      /ADMIN_CSRF_SECRET must be set in production/i,
    );

    const someToken: string = Buffer.from("{}", "utf8").toString("base64url");
    expect(verifyCsrfToken("admin-login", someToken)).toBe(false);
  });
});
