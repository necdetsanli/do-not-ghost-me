// tests/integration/api.admin.login.test.ts
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_ADMIN_CSRF_SECRET,
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_PASSWORD_WRONG,
  TEST_ADMIN_SESSION_SECRET,
  TEST_RATE_LIMIT_IP_SALT,
} from "../testUtils/testSecrets";

/**
 * Applies a minimal valid env for importing the app env schema.
 *
 * Uses vi.stubEnv to avoid direct process.env assignments (read-only typing).
 *
 * @param overrides - Partial env overrides for a test.
 * @returns void
 */
function applyBaseEnv(overrides: Partial<Record<string, string>> = {}): void {
  vi.stubEnv("NODE_ENV", overrides.NODE_ENV ?? "test");

  vi.stubEnv(
    "DATABASE_URL",
    overrides.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/testdb",
  );

  vi.stubEnv("RATE_LIMIT_IP_SALT", overrides.RATE_LIMIT_IP_SALT ?? TEST_RATE_LIMIT_IP_SALT);

  vi.stubEnv("ADMIN_PASSWORD", overrides.ADMIN_PASSWORD ?? TEST_ADMIN_PASSWORD);

  vi.stubEnv("ADMIN_SESSION_SECRET", overrides.ADMIN_SESSION_SECRET ?? TEST_ADMIN_SESSION_SECRET);

  vi.stubEnv("ADMIN_CSRF_SECRET", overrides.ADMIN_CSRF_SECRET ?? TEST_ADMIN_CSRF_SECRET);

  // If you want "unset", keep it as an empty string so the app can treat it as disabled.
  vi.stubEnv("ADMIN_ALLOWED_HOST", overrides.ADMIN_ALLOWED_HOST ?? "");
}

/**
 * Builds a NextRequest for POST /api/admin/login with the desired headers and form fields.
 *
 * @param url - Absolute URL for the request.
 * @param headers - Request headers.
 * @param form - Form fields encoded as application/x-www-form-urlencoded.
 * @returns NextRequest instance.
 */
function buildLoginPostRequest(
  url: string,
  headers: Record<string, string>,
  form: Record<string, string>,
): NextRequest {
  const body = new URLSearchParams(form);

  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body,
  });
}

/**
 * Imports the login route handler with a fresh module graph after env changes.
 *
 * @returns The imported POST handler.
 */
async function importLoginPost(): Promise<{
  POST: (req: NextRequest) => Promise<Response>;
}> {
  vi.resetModules();
  const mod = await import("@/app/api/admin/login/route");
  return { POST: mod.POST as (req: NextRequest) => Promise<Response> };
}

/**
 * Imports CSRF helper with a fresh module graph (depends on env).
 *
 * @returns CSRF helper functions.
 */
async function importCsrfHelpers(): Promise<{
  createCsrfToken: (purpose: string) => string;
}> {
  vi.resetModules();
  const mod = await import("@/lib/csrf");
  return {
    createCsrfToken: mod.createCsrfToken as (purpose: string) => string,
  };
}

/**
 * Generates a valid and an invalid CSRF token based on current env.
 *
 * IMPORTANT: Must be called after applyBaseEnv(), because createCsrfToken depends on env.
 *
 * @returns CSRF tokens.
 */
async function getCsrfTokens(): Promise<{ validCsrf: string; invalidCsrf: string }> {
  const { createCsrfToken } = await importCsrfHelpers();

  return {
    validCsrf: createCsrfToken("admin-login"),
    invalidCsrf: createCsrfToken("not-admin-login"), // purpose mismatch => invalid
  };
}

/**
 * Asserts a redirect response to /admin/login?error=1.
 *
 * @param res - Response to assert.
 * @returns Promise resolved after assertions.
 */
async function expectErrorRedirect(res: Response): Promise<void> {
  expect(res.status).toBe(303);
  const location = res.headers.get("location");
  expect(typeof location).toBe("string");
  expect(location as string).toContain("/admin/login");
  expect(location as string).toContain("error=1");
}

/**
 * Extracts the Set-Cookie header (single header) if present.
 *
 * @param res - Response object.
 * @returns Set-Cookie string or null.
 */
function getSetCookie(res: Response): string | null {
  const raw = res.headers.get("set-cookie");

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }

  return raw;
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    // Ensure a known base env exists for each test unless overridden.
    applyBaseEnv();

    delete (globalThis as unknown as { __adminLoginRateLimitStore?: unknown })
      .__adminLoginRateLimitStore;
  });

  afterEach(() => {
    // Restore env stubs back to original values.
    vi.unstubAllEnvs();

    // Restore spies/mocks.
    vi.restoreAllMocks();

    // Ensure module-level caches/mocks do not leak across tests.
    vi.resetModules();
  });

  it("allows request when Origin header is absent (covers isOriginAllowed return true)", async () => {
    // This covers line 181: return true when originHeader === null
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    // Request WITHOUT origin header
    const req = buildLoginPostRequest(
      "https://example.test/api/admin/login",
      {
        host: "example.test",
        // Note: no origin header
        "x-forwarded-for": "203.0.113.180",
      },
      { password: TEST_ADMIN_PASSWORD, _csrf: validCsrf },
    );

    const res = await POST(req);
    // Should proceed to authentication (not blocked by origin check)
    // May succeed or fail auth, but not 403 for host/origin mismatch
    expect(res.status).not.toBe(403);
  });

  it("compares origin host to request host when ADMIN_ALLOWED_HOST is empty", async () => {
    // This covers line 208: return normalizedOriginHost === hostHeader
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    // Request with matching origin and host headers, no ADMIN_ALLOWED_HOST
    const req = buildLoginPostRequest(
      "https://example.test/api/admin/login",
      {
        host: "example.test",
        origin: "https://example.test",
        "x-forwarded-for": "203.0.113.181",
      },
      { password: TEST_ADMIN_PASSWORD, _csrf: validCsrf },
    );

    const res = await POST(req);
    // Should proceed to authentication (origin matches host)
    expect(res.status).not.toBe(403);
  });

  it("returns 403 JSON when ADMIN_ALLOWED_HOST is set and Host header mismatches", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { invalidCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "evil.test",
      },
      { password: TEST_ADMIN_PASSWORD_WRONG, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("returns 403 JSON when Origin header is present and mismatches allowed host", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { invalidCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://evil.test",
      },
      { password: TEST_ADMIN_PASSWORD_WRONG, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("redirects to /admin/login?error=1 when CSRF is invalid", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { invalidCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.21",
      },
      { password: TEST_ADMIN_PASSWORD, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    await expectErrorRedirect(res);
    expect(getSetCookie(res)).toBeNull();
  });

  it("redirects to /admin/login?error=1 when password is missing", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.22",
      },
      { _csrf: validCsrf },
    );

    const res = await POST(req);
    await expectErrorRedirect(res);
    expect(getSetCookie(res)).toBeNull();
  });

  it("redirects to /admin/login?error=1 when password is wrong", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.23",
      },
      { password: TEST_ADMIN_PASSWORD_WRONG, _csrf: validCsrf },
    );

    const res = await POST(req);
    await expectErrorRedirect(res);
    expect(getSetCookie(res)).toBeNull();
  });

  it("redirects to /admin and sets a signed HttpOnly session cookie when password is correct", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.24",
      },
      { password: TEST_ADMIN_PASSWORD, _csrf: validCsrf },
    );

    const res = await POST(req);

    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).toBe("https://allowed.test/admin");

    const setCookie = getSetCookie(res);
    expect(typeof setCookie).toBe("string");
    expect(setCookie as string).toContain("__Host-dg_admin=");
    expect(setCookie as string).toContain("HttpOnly");
    expect(setCookie as string).toMatch(/SameSite=strict/i);
    expect(setCookie as string).toContain("Path=/");
  });

  it("returns 429 JSON after too many failed attempts from the same IP", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const url = "https://allowed.test/api/admin/login";
    const headers = {
      host: "allowed.test",
      origin: "https://allowed.test",
      "x-forwarded-for": "203.0.113.25",
    } satisfies Record<string, string>;

    for (let i = 0; i < 5; i += 1) {
      const req = buildLoginPostRequest(url, headers, {
        password: TEST_ADMIN_PASSWORD_WRONG,
        _csrf: validCsrf,
      });
      const res = await POST(req);
      await expectErrorRedirect(res);
    }

    const sixthReq = buildLoginPostRequest(url, headers, {
      password: TEST_ADMIN_PASSWORD_WRONG,
      _csrf: validCsrf,
    });
    const sixthRes = await POST(sixthReq);

    expect(sixthRes.status).toBe(429);
    const json = (await sixthRes.json()) as { error?: string };
    expect(typeof json.error).toBe("string");
    expect(json.error as string).toMatch(/too many admin login attempts/i);
  });

  it("returns 403 JSON when Origin header is not a valid URL", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { invalidCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "not-a-url",
      },
      { password: TEST_ADMIN_PASSWORD_WRONG, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("resets IP lock after lock window expires", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const url = "https://allowed.test/api/admin/login";
    const headers = {
      host: "allowed.test",
      origin: "https://allowed.test",
      "x-forwarded-for": "203.0.113.77",
    } satisfies Record<string, string>;

    for (let i = 0; i < 5; i += 1) {
      const req = buildLoginPostRequest(url, headers, {
        password: TEST_ADMIN_PASSWORD_WRONG,
        _csrf: validCsrf,
      });
      const res = await POST(req);
      await expectErrorRedirect(res);
    }

    const lockedReq = buildLoginPostRequest(url, headers, {
      password: TEST_ADMIN_PASSWORD_WRONG,
      _csrf: validCsrf,
    });
    const lockedRes = await POST(lockedReq);
    expect(lockedRes.status).toBe(429);

    // 15 minutes + 1ms (lock duration in route.ts)
    vi.setSystemTime(new Date("2025-01-01T00:15:00.001Z"));

    const afterLockReq = buildLoginPostRequest(url, headers, {
      password: TEST_ADMIN_PASSWORD_WRONG,
      _csrf: validCsrf,
    });
    const afterLockRes = await POST(afterLockReq);

    await expectErrorRedirect(afterLockRes);

    vi.useRealTimers();
  });

  it("resets attempts when first attempt is outside the rate limit window", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const url = "https://allowed.test/api/admin/login";
    const headers = {
      host: "allowed.test",
      origin: "https://allowed.test",
      "x-forwarded-for": "203.0.113.99",
    } satisfies Record<string, string>;

    // Make 4 failed attempts (one shy of lock)
    for (let i = 0; i < 4; i += 1) {
      const req = buildLoginPostRequest(url, headers, {
        password: TEST_ADMIN_PASSWORD_WRONG,
        _csrf: validCsrf,
      });
      const res = await POST(req);
      await expectErrorRedirect(res);
    }

    // Jump 6 minutes (LOGIN_RATE_LIMIT_WINDOW_MS is 5 minutes)
    vi.setSystemTime(new Date("2025-01-01T00:06:00.000Z"));

    // This should reset the window and start fresh count
    const afterWindowReq = buildLoginPostRequest(url, headers, {
      password: TEST_ADMIN_PASSWORD_WRONG,
      _csrf: validCsrf,
    });
    const afterWindowRes = await POST(afterWindowReq);
    await expectErrorRedirect(afterWindowRes);

    // We should be able to make more attempts without getting locked
    const secondAttemptReq = buildLoginPostRequest(url, headers, {
      password: TEST_ADMIN_PASSWORD_WRONG,
      _csrf: validCsrf,
    });
    const secondAttemptRes = await POST(secondAttemptReq);
    await expectErrorRedirect(secondAttemptRes);

    vi.useRealTimers();
  });

  it("returns 403 JSON when Origin present but Host header is missing and ADMIN_ALLOWED_HOST not set", async () => {
    // This test covers the hostHeader === null branch when no ADMIN_ALLOWED_HOST is set
    // Apply base env first, then override ADMIN_ALLOWED_HOST to empty string (falsy)
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "" });

    const { invalidCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    // Request with Origin but no host header and no ADMIN_ALLOWED_HOST
    const req = buildLoginPostRequest(
      "https://example.test/api/admin/login",
      {
        origin: "https://example.test",
        // Note: no host header
      },
      { password: TEST_ADMIN_PASSWORD_WRONG, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("returns 403 JSON when Origin header has invalid URL format", async () => {
    // This test covers the catch block at line 181 for invalid origin URL
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { invalidCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    // Request with an invalid origin URL that can't be parsed
    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "not-a-valid-url",
        "x-forwarded-for": "203.0.113.99",
      },
      { password: TEST_ADMIN_PASSWORD_WRONG, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("returns 400 when client IP is missing", async () => {
    // Missing/blank IP should fail closed with generic 400.
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { validCsrf } = await getCsrfTokens();
    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        // No X-Forwarded-For / client IP headers
      },
      { password: TEST_ADMIN_PASSWORD, _csrf: validCsrf },
    );

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Bad request");
    expect(getSetCookie(res)).toBeNull();
  });

  it("returns 500 JSON when CSRF verification throws unexpectedly", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { invalidCsrf } = await getCsrfTokens();

    vi.resetModules();
    vi.doMock("@/lib/csrf", () => ({
      verifyCsrfToken: () => {
        throw new Error("boom");
      },
    }));

    const mod = await import("@/app/api/admin/login/route");
    const POST = mod.POST as (req: NextRequest) => Promise<Response>;

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.78",
      },
      { password: TEST_ADMIN_PASSWORD, _csrf: invalidCsrf },
    );

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Internal server error");

    vi.unmock("@/lib/csrf");
  });
});
