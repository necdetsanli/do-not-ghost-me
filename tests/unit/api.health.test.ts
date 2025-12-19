// tests/unit/api.health.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

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
  env.RATE_LIMIT_IP_SALT = "test-rate-limit-salt-32-bytes-minimum-000000";
  env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "3";
  env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "10";

  env.ADMIN_PASSWORD = "test-admin-password";
  env.ADMIN_SESSION_SECRET = "test-admin-session-secret-32-bytes-minimum-0000000";
  env.ADMIN_CSRF_SECRET = "test-admin-csrf-secret-32-bytes-minimum-000000000";
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
});
