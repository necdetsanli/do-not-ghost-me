// tests/unit/adminLoginRateLimiter.test.ts
import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminLoginRateLimiter,
  hashAdminIp,
  resetAdminLoginRateLimiter,
} from "@/lib/adminLoginRateLimiter";
import { env } from "@/env";

const NOW = Date.now();

describe("adminLoginRateLimiter (memory strategy)", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_LOGIN_RATE_LIMIT_STRATEGY", "memory");
    resetAdminLoginRateLimiter();
  });

  it("hashes IPs with HMAC using RATE_LIMIT_IP_SALT", () => {
    const hmacSpy = vi.spyOn(crypto, "createHmac");

    const hash = hashAdminIp("203.0.113.1");

    expect(hash.length).toBeGreaterThan(0);
    expect(hmacSpy).toHaveBeenCalledWith("sha256", env.RATE_LIMIT_IP_SALT);
  });

  it("locks after max attempts within the window", async () => {
    const limiter = getAdminLoginRateLimiter();
    const ipHash = hashAdminIp("203.0.113.10");

    for (let i = 0; i < 5; i += 1) {
      await limiter.registerFailure(ipHash, NOW + i * 1000);
    }

    const locked = await limiter.isLocked(ipHash, NOW + 2000);
    expect(locked).toBe(true);
  });

  it("resets after window expires", async () => {
    const limiter = getAdminLoginRateLimiter();
    const ipHash = hashAdminIp("203.0.113.11");

    for (let i = 0; i < 4; i += 1) {
      await limiter.registerFailure(ipHash, NOW + i * 1000);
    }

    // After window (5 minutes) expires, should not be locked
    const afterWindow = NOW + 6 * 60 * 1000;
    const locked = await limiter.isLocked(ipHash, afterWindow);
    expect(locked).toBe(false);
  });
});
