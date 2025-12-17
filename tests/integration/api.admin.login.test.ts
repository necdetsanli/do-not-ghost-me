import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Environment snapshot type for safe restore.
 */
type EnvSnapshot = Record<string, string | undefined>;

/**
 * Takes a snapshot of process.env keys used in these tests.
 *
 * @returns Snapshot object.
 */
function snapshotEnv(): EnvSnapshot {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    RATE_LIMIT_IP_SALT: process.env.RATE_LIMIT_IP_SALT,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    ADMIN_ALLOWED_HOST: process.env.ADMIN_ALLOWED_HOST,
    ADMIN_CSRF_SECRET: process.env.ADMIN_CSRF_SECRET,
  };
}

/**
 * Restores process.env from a snapshot.
 *
 * @param snap - Environment snapshot.
 * @returns void
 */
function restoreEnv(snap: EnvSnapshot): void {
  process.env.NODE_ENV = snap.NODE_ENV;
  process.env.DATABASE_URL = snap.DATABASE_URL;
  process.env.RATE_LIMIT_IP_SALT = snap.RATE_LIMIT_IP_SALT;
  process.env.ADMIN_PASSWORD = snap.ADMIN_PASSWORD;
  process.env.ADMIN_SESSION_SECRET = snap.ADMIN_SESSION_SECRET;
  process.env.ADMIN_ALLOWED_HOST = snap.ADMIN_ALLOWED_HOST;
  process.env.ADMIN_CSRF_SECRET = snap.ADMIN_CSRF_SECRET;
}

/**
 * Applies a minimal valid env for importing the app env schema.
 *
 * @param overrides - Partial env overrides for a test.
 * @returns void
 */
function applyBaseEnv(overrides: Partial<Record<string, string>> = {}): void {
  process.env.NODE_ENV = overrides.NODE_ENV ?? "test";
  process.env.DATABASE_URL =
    overrides.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/testdb";
  process.env.RATE_LIMIT_IP_SALT =
    overrides.RATE_LIMIT_IP_SALT ??
    "test-rate-limit-salt-32-bytes-minimum-000000";
  process.env.ADMIN_PASSWORD =
    overrides.ADMIN_PASSWORD ?? "test-admin-password";
  process.env.ADMIN_SESSION_SECRET =
    overrides.ADMIN_SESSION_SECRET ??
    "test-admin-session-secret-32-bytes-minimum-0000000";
  process.env.ADMIN_CSRF_SECRET =
    overrides.ADMIN_CSRF_SECRET ??
    "test-admin-csrf-secret-32-bytes-minimum-000000000";
  process.env.ADMIN_ALLOWED_HOST = overrides.ADMIN_ALLOWED_HOST;
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
  let snap: EnvSnapshot;

  beforeEach(() => {
    snap = snapshotEnv();
    delete (globalThis as unknown as { __adminLoginRateLimitStore?: unknown })
      .__adminLoginRateLimitStore;
  });

  afterEach(() => {
    restoreEnv(snap);
    vi.restoreAllMocks();
  });

  it("returns 403 JSON when ADMIN_ALLOWED_HOST is set and Host header mismatches", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "evil.test",
      },
      { password: "whatever", _csrf: "irrelevant" },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("returns 403 JSON when Origin header is present and mismatches allowed host", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://evil.test",
      },
      { password: "whatever", _csrf: "irrelevant" },
    );

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("redirects to /admin/login?error=1 when CSRF is invalid", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.21",
      },
      { password: "test-admin-password", _csrf: "invalid-csrf" },
    );

    const res = await POST(req);
    await expectErrorRedirect(res);
    expect(getSetCookie(res)).toBeNull();
  });

  it("redirects to /admin/login?error=1 when password is missing", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { createCsrfToken } = await importCsrfHelpers();
    const csrf = createCsrfToken("admin-login");

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.22",
      },
      { _csrf: csrf },
    );

    const res = await POST(req);
    await expectErrorRedirect(res);
    expect(getSetCookie(res)).toBeNull();
  });

  it("redirects to /admin/login?error=1 when password is wrong", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { createCsrfToken } = await importCsrfHelpers();
    const csrf = createCsrfToken("admin-login");

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.23",
      },
      { password: "wrong-password", _csrf: csrf },
    );

    const res = await POST(req);
    await expectErrorRedirect(res);
    expect(getSetCookie(res)).toBeNull();
  });

  it("redirects to /admin and sets a signed HttpOnly session cookie when password is correct", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { createCsrfToken } = await importCsrfHelpers();
    const csrf = createCsrfToken("admin-login");

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "https://allowed.test",
        "x-forwarded-for": "203.0.113.24",
      },
      { password: "test-admin-password", _csrf: csrf },
    );

    const res = await POST(req);

    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).toBe("https://allowed.test/admin");

    const setCookie = getSetCookie(res);
    expect(typeof setCookie).toBe("string");
    expect(setCookie as string).toContain("dg_admin=");
    expect(setCookie as string).toContain("HttpOnly");
    expect(setCookie as string).toMatch(/SameSite=strict/i);
    expect(setCookie as string).toContain("Path=/");
  });

  it("returns 429 JSON after too many failed attempts from the same IP", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { createCsrfToken } = await importCsrfHelpers();
    const csrf = createCsrfToken("admin-login");

    const { POST } = await importLoginPost();

    const url = "https://allowed.test/api/admin/login";
    const headers = {
      host: "allowed.test",
      origin: "https://allowed.test",
      "x-forwarded-for": "203.0.113.25",
    } satisfies Record<string, string>;

    for (let i = 0; i < 5; i += 1) {
      const req = buildLoginPostRequest(url, headers, {
        password: "wrong-password",
        _csrf: csrf,
      });
      const res = await POST(req);
      await expectErrorRedirect(res);
    }

    const sixthReq = buildLoginPostRequest(url, headers, {
      password: "wrong-password",
      _csrf: csrf,
    });
    const sixthRes = await POST(sixthReq);

    expect(sixthRes.status).toBe(429);
    const json = (await sixthRes.json()) as { error?: string };
    expect(typeof json.error).toBe("string");
    expect(json.error as string).toMatch(/too many admin login attempts/i);
  });
  it("returns 403 JSON when Origin header is not a valid URL", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

    const { POST } = await importLoginPost();

    const req = buildLoginPostRequest(
      "https://allowed.test/api/admin/login",
      {
        host: "allowed.test",
        origin: "not-a-url",
      },
      { password: "whatever", _csrf: "irrelevant" },
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

    const { createCsrfToken } = await importCsrfHelpers();
    const csrf = createCsrfToken("admin-login");

    const { POST } = await importLoginPost();

    const url = "https://allowed.test/api/admin/login";
    const headers = {
      host: "allowed.test",
      origin: "https://allowed.test",
      "x-forwarded-for": "203.0.113.77",
    } satisfies Record<string, string>;

    for (let i = 0; i < 5; i += 1) {
      const req = buildLoginPostRequest(url, headers, {
        password: "wrong-password",
        _csrf: csrf,
      });
      const res = await POST(req);
      await expectErrorRedirect(res);
    }

    const lockedReq = buildLoginPostRequest(url, headers, {
      password: "wrong-password",
      _csrf: csrf,
    });
    const lockedRes = await POST(lockedReq);
    expect(lockedRes.status).toBe(429);

    // 15 minutes + 1ms (lock duration in route.ts)
    vi.setSystemTime(new Date("2025-01-01T00:15:00.001Z"));

    const afterLockReq = buildLoginPostRequest(url, headers, {
      password: "wrong-password",
      _csrf: csrf,
    });
    const afterLockRes = await POST(afterLockReq);

    // Not 429 anymore; proceeds and fails password -> redirect.
    await expectErrorRedirect(afterLockRes);

    vi.useRealTimers();
  });

  it("returns 500 JSON when CSRF verification throws unexpectedly", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "allowed.test" });

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
      { password: "test-admin-password", _csrf: "any" },
    );

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Internal server error");

    vi.unmock("@/lib/csrf");
  });
});
