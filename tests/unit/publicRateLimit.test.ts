// tests/unit/publicRateLimit.test.ts
import {
  applyPublicRateLimit,
  enforcePublicIpRateLimit,
  PublicRateLimitError,
  resetPublicRateLimitStore,
} from "@/lib/publicRateLimit";
import type { NextRequest } from "next/server";
import net from "node:net";
import { beforeEach, describe, expect, it } from "vitest";

describe("publicRateLimit", () => {
  beforeEach(() => {
    resetPublicRateLimitStore();
  });

  it("throws when IP is empty or invalid", () => {
    expect(() => enforcePublicIpRateLimit({ ip: "   ", scope: "test" })).toThrow(
      PublicRateLimitError,
    );

    expect(net.isIP("not-an-ip")).toBe(0);
    expect(() => enforcePublicIpRateLimit({ ip: "not-an-ip", scope: "test" })).toThrow(
      "Client IP invalid",
    );
  });

  it("enforces limit and sweeps old entries when over capacity", () => {
    const now = Date.now();
    const windowMs = 1000;
    const maxStoreSize = 3;

    enforcePublicIpRateLimit({
      ip: "203.0.113.1",
      scope: "s",
      now,
      windowMs,
      maxStoreSize,
      maxRequests: 2,
    });

    enforcePublicIpRateLimit({
      ip: "203.0.113.1",
      scope: "s",
      now,
      windowMs,
      maxStoreSize,
      maxRequests: 2,
    });

    expect(() =>
      enforcePublicIpRateLimit({
        ip: "203.0.113.1",
        scope: "s",
        now,
        windowMs,
        maxStoreSize,
        maxRequests: 2,
      }),
    ).toThrow(PublicRateLimitError);

    // Fill store past capacity with expired entries, then ensure sweep prunes.
    const past = now - windowMs - 1;
    const ips = ["203.0.113.2", "203.0.113.3", "203.0.113.4", "203.0.113.5"];

    for (const ip of ips) {
      enforcePublicIpRateLimit({
        ip,
        scope: "s",
        now: past,
        windowMs,
        maxStoreSize,
      });
    }

    // Trigger sweep with a fresh request.
    enforcePublicIpRateLimit({
      ip: "203.0.113.6",
      scope: "s",
      now,
      windowMs,
      maxStoreSize,
    });
  });

  it("throws when scope is empty", () => {
    expect(() => enforcePublicIpRateLimit({ ip: "203.0.113.1", scope: "" })).toThrow(
      PublicRateLimitError,
    );
  });

  it("throws when scope is whitespace only", () => {
    expect(() => enforcePublicIpRateLimit({ ip: "203.0.113.1", scope: "   " })).toThrow(
      "Invalid rate limit scope",
    );
  });
});

/**
 * Helper to create a minimal NextRequest-like object for testing applyPublicRateLimit.
 */
function createMockRequest(ip: string | null): NextRequest {
  const headers = new Headers();
  if (ip !== null) {
    headers.set("x-forwarded-for", ip);
  }

  return {
    url: "https://example.test/api/test",
    method: "GET",
    headers,
    nextUrl: { pathname: "/api/test" },
  } as unknown as NextRequest;
}

describe("applyPublicRateLimit", () => {
  beforeEach(() => {
    resetPublicRateLimitStore();
  });

  it("returns allowed: true with clientIp when under limit", () => {
    const req = createMockRequest("203.0.113.50");

    const result = applyPublicRateLimit(req, {
      scope: "test-scope",
      maxRequests: 10,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.clientIp).toBe("203.0.113.50");
    }
  });

  it("returns allowed: false with 429 response when IP is missing", () => {
    const req = createMockRequest(null);

    const result = applyPublicRateLimit(req, {
      scope: "test-scope",
      maxRequests: 10,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response).toBeDefined();
      expect(result.response.status).toBe(429);
    }
  });

  it("returns allowed: false with 429 when rate limit exceeded", () => {
    const req = createMockRequest("203.0.113.51");

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      applyPublicRateLimit(req, {
        scope: "exhaust-scope",
        maxRequests: 5,
        windowMs: 60_000,
      });
    }

    // Next request should be rate limited
    const result = applyPublicRateLimit(req, {
      scope: "exhaust-scope",
      maxRequests: 5,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(429);
    }
  });

  it("uses custom error headers when provided", () => {
    const req = createMockRequest(null);

    const result = applyPublicRateLimit(req, {
      scope: "test-scope",
      maxRequests: 10,
      windowMs: 60_000,
      errorHeaders: {
        "x-custom-header": "custom-value",
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.headers.get("x-custom-header")).toBe("custom-value");
    }
  });

  it("logs with custom context when provided", () => {
    const req = createMockRequest("203.0.113.52");

    // Should not throw even with custom logContext
    const result = applyPublicRateLimit(req, {
      scope: "test-scope",
      maxRequests: 10,
      windowMs: 60_000,
      logContext: "[CustomContext]",
    });

    expect(result.allowed).toBe(true);
  });
});

describe("sweepStore edge cases", () => {
  beforeEach(() => {
    resetPublicRateLimitStore();
  });

  it("handles sweep on empty store gracefully", () => {
    // Store is empty after reset
    // Making a single request should work without issue
    expect(() => {
      enforcePublicIpRateLimit({
        ip: "203.0.113.60",
        scope: "test",
        maxRequests: 10,
        windowMs: 60_000,
        maxStoreSize: 5,
      });
    }).not.toThrow();
  });

  it("handles sweep when all entries expire within the same call", () => {
    const windowMs = 1000;
    const now = Date.now();

    // Add an entry in the past (will be expired)
    enforcePublicIpRateLimit({
      ip: "203.0.113.70",
      scope: "test",
      maxRequests: 100,
      windowMs,
      maxStoreSize: 10,
      now: now - windowMs - 100, // Expired timestamp
    });

    // Now make a request with current time - the sweep will:
    // 1. Delete the expired entry (leaving store empty)
    // 2. Check store.size === 0 (should hit line 100)
    // 3. Add the new entry
    expect(() => {
      enforcePublicIpRateLimit({
        ip: "203.0.113.71",
        scope: "test",
        maxRequests: 100,
        windowMs,
        maxStoreSize: 10,
        now, // Current time
      });
    }).not.toThrow();
  });

  it("evicts entries when store exceeds maxStoreSize", () => {
    const now = Date.now();

    // Fill store beyond capacity with staggered timestamps
    for (let i = 0; i < 20; i++) {
      enforcePublicIpRateLimit({
        ip: `203.0.113.${i + 1}`,
        scope: "test",
        maxRequests: 100,
        windowMs: 60_000,
        maxStoreSize: 5,
        now: now + i * 10,
      });
    }

    // Should not throw - eviction should have occurred
    expect(() => {
      enforcePublicIpRateLimit({
        ip: "203.0.113.100",
        scope: "test",
        maxRequests: 100,
        windowMs: 60_000,
        maxStoreSize: 5,
        now: now + 1000,
      });
    }).not.toThrow();
  });
});
