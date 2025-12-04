// tests/unit/rateLimit.hash.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { hashIp } from "@/lib/rateLimit";

const ORIGINAL_ENV = { ...process.env };

describe("hashIp", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("produces a stable hash for the same IP and salt", () => {
    process.env.RATE_LIMIT_IP_SALT = "very-long-and-random-test-salt";

    const ip = "203.0.113.42";

    const h1 = hashIp(ip);
    const h2 = hashIp(ip);

    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toContain(ip);
  });

  it("produces different hashes for different salts", () => {
    const ip = "203.0.113.99";

    process.env.RATE_LIMIT_IP_SALT = "salt-one-for-testing";
    const h1 = hashIp(ip);

    process.env.RATE_LIMIT_IP_SALT = "salt-two-for-testing";
    const h2 = hashIp(ip);

    expect(h1).not.toBe(h2);
  });

  it("falls back to dev salt when RATE_LIMIT_IP_SALT is missing or too short", () => {
    delete process.env.RATE_LIMIT_IP_SALT;

    const ip = "192.0.2.1";
    const h1 = hashIp(ip);
    const h2 = hashIp(ip);

    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
