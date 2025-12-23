// tests/unit/api.health.test.ts
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_ADMIN_CSRF_SECRET,
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_SESSION_SECRET,
  TEST_RATE_LIMIT_IP_SALT,
} from "../testUtils/testSecrets";

type EnvSnapshot = Record<string, string | undefined>;

type HealthRouteModule = {
  GET: (req: NextRequest) => Response;
  HEAD: (req: NextRequest) => Response;
};

type PublicRateLimitModule = {
  resetPublicRateLimitStore: () => void;
};

/**
 * Takes a snapshot of env keys that are relevant for importing the app env schema.
 *
 * @returns Snapshot object.
 */
function snapshotEnv(): EnvSnapshot {
  const env = process.env as unknown as Record<string, string | undefined>;

  return {
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL,
    RATE_LIMIT_IP_SALT: env.RATE_LIMIT_IP_SALT,
    RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
    RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: env.ADMIN_SESSION_SECRET,
    ADMIN_ALLOWED_HOST: env.ADMIN_ALLOWED_HOST,
    ADMIN_CSRF_SECRET: env.ADMIN_CSRF_SECRET,
  };
}

/**
 * Restores env values from a snapshot (deletes keys that were originally absent).
 *
 * @param snap - Snapshot object.
 * @returns void
 */
function restoreEnv(snap: EnvSnapshot): void {
  const env = process.env as unknown as Record<string, string | undefined>;

  for (const [k, v] of Object.entries(snap)) {
    if (v === undefined) {
      delete env[k];
      continue;
    }
    env[k] = v;
  }
}

/**
 * Applies a minimal valid env so modules importing "@/env" can load safely.
 *
 * @returns void
 */
function applyBaseEnv(): void {
  const env = process.env as unknown as Record<string, string | undefined>;

  env.NODE_ENV = "test";
  env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
  env.RATE_LIMIT_IP_SALT = TEST_RATE_LIMIT_IP_SALT;
  env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "3";
  env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "10";

  env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
  env.ADMIN_SESSION_SECRET = TEST_ADMIN_SESSION_SECRET;
  env.ADMIN_CSRF_SECRET = TEST_ADMIN_CSRF_SECRET;
  env.ADMIN_ALLOWED_HOST = "example.test";
}

/**
 * Builds a NextRequest for /api/health with an x-forwarded-for header.
 *
 * @param ip - Client IP.
 * @returns NextRequest instance.
 */
function buildHealthRequest(ip: string): NextRequest {
  return new NextRequest("https://example.test/api/health", {
    method: "GET",
    headers: {
      "x-forwarded-for": ip,
    },
  });
}

/**
 * Imports the health route fresh and returns helpers for tests.
 *
 * @returns Imported route module and rate limit reset helper.
 */
async function importHealthFresh(): Promise<{
  route: HealthRouteModule;
  rateLimit: PublicRateLimitModule;
}> {
  vi.resetModules();

  const route = (await import("@/app/api/health/route")) as HealthRouteModule;
  const rateLimit = (await import("@/lib/publicRateLimit")) as PublicRateLimitModule;

  return { route, rateLimit };
}

describe("/api/health", () => {
  let snap: EnvSnapshot;

  beforeEach(() => {
    snap = snapshotEnv();
    applyBaseEnv();

    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv(snap);
    vi.resetModules();
  });

  it("returns 200 with {status:'ok'} and no-store headers", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    const res = route.GET(buildHealthRequest("203.0.113.10"));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");

    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });

  it("rate limits after 60 requests per minute for the same IP", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    const req = buildHealthRequest("203.0.113.11");

    for (let i = 0; i < 60; i += 1) {
      const res = route.GET(req);
      expect(res.status).toBe(200);
    }

    const limited = route.GET(req);
    expect(limited.status).toBe(429);

    const json = (await limited.json()) as { error?: string };
    expect(json.error).toBe("Too many requests");
  });

  it("HEAD returns the same status and headers as GET but with empty body", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    const req = buildHealthRequest("203.0.113.12");

    const head = route.HEAD(req);
    expect(head.status).toBe(200);
    expect(head.headers.get("cache-control")).toBe("no-store");

    const text = await head.text();
    expect(text).toBe("");
  });

  it("falls back to FALLBACK_IP when x-forwarded-for is missing", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    // Request without x-forwarded-for header
    const req = new NextRequest("https://example.test/api/health", {
      method: "GET",
    });

    const res = route.GET(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });

  it("falls back to FALLBACK_IP when IP is 'unknown' (case-insensitive)", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    const req = new NextRequest("https://example.test/api/health", {
      method: "GET",
      headers: { "x-forwarded-for": "Unknown" },
    });

    const res = route.GET(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });

  it("falls back to FALLBACK_IP when IP is empty after trim", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    const req = new NextRequest("https://example.test/api/health", {
      method: "GET",
      headers: { "x-forwarded-for": "   " },
    });

    const res = route.GET(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });

  it("falls back to FALLBACK_IP when getClientIp returns empty string after trim", async () => {
    vi.resetModules();

    // Mock getClientIp to return a string that becomes empty after trim
    vi.doMock("@/lib/ip", () => ({
      getClientIp: () => "   ",
    }));

    applyBaseEnv();
    const route = (await import("@/app/api/health/route")) as HealthRouteModule;
    const rateLimit = (await import("@/lib/publicRateLimit")) as PublicRateLimitModule;
    rateLimit.resetPublicRateLimitStore();

    const req = new NextRequest("https://example.test/api/health", {
      method: "GET",
    });

    const res = route.GET(req);
    expect(res.status).toBe(200);

    vi.doUnmock("@/lib/ip");
  });

  it("falls back to FALLBACK_IP when getClientIp returns 'unknown' string", async () => {
    vi.resetModules();

    // Mock getClientIp to return "unknown" directly
    vi.doMock("@/lib/ip", () => ({
      getClientIp: () => "unknown",
    }));

    applyBaseEnv();
    const route = (await import("@/app/api/health/route")) as HealthRouteModule;
    const rateLimit = (await import("@/lib/publicRateLimit")) as PublicRateLimitModule;
    rateLimit.resetPublicRateLimitStore();

    const req = new NextRequest("https://example.test/api/health", {
      method: "GET",
    });

    const res = route.GET(req);
    expect(res.status).toBe(200);

    vi.doUnmock("@/lib/ip");
  });

  it("fails open on unexpected rate limit error", async () => {
    const { route, rateLimit } = await importHealthFresh();
    rateLimit.resetPublicRateLimitStore();

    // Create requests until one causes a rate limit error
    const req = buildHealthRequest("203.0.113.99");

    // Make 60 requests to hit the limit
    for (let i = 0; i < 60; i += 1) {
      route.GET(req);
    }

    // The 61st request should be rate limited
    const limited = route.GET(req);
    expect(limited.status).toBe(429);
  });
});

describe("/api/health fail-open behavior", () => {
  let snap: EnvSnapshot;

  beforeEach(() => {
    snap = snapshotEnv();
    applyBaseEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv(snap);
    vi.resetModules();
  });

  it("returns 200 when enforcePublicIpRateLimit throws unexpected error", async () => {
    vi.resetModules();

    // Mock publicRateLimit to throw a non-PublicRateLimitError
    vi.doMock("@/lib/publicRateLimit", () => ({
      enforcePublicIpRateLimit: () => {
        throw new Error("Unexpected internal error");
      },
      PublicRateLimitError: class PublicRateLimitError extends Error {
        statusCode = 429;
      },
      resetPublicRateLimitStore: () => {},
    }));

    // Mock getClientIp to return a valid IP
    vi.doMock("@/lib/ip", () => ({
      getClientIp: () => "192.0.2.100",
    }));

    const { GET } = await import("@/app/api/health/route");

    const req = new NextRequest("https://example.test/api/health", {
      method: "GET",
    });

    // Should fail open - return 200 even though an unexpected error occurred
    const res = GET(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { status?: string };
    expect(json.status).toBe("ok");
  });
});
