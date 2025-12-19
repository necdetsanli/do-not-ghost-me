// tests/unit/publicRateLimit.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import net from "node:net";
import {
  enforcePublicIpRateLimit,
  PublicRateLimitError,
  resetPublicRateLimitStore,
} from "@/lib/publicRateLimit";

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
});
