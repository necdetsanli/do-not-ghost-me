import { describe, it, expect } from "vitest";
import { hashIp } from "@/lib/rateLimit";
import { ReportRateLimitError } from "@/lib/rateLimitError";

/**
 * Unit tests for the IP hashing helper.
 */
describe("hashIp", () => {
  it("produces a stable hash for the same IP", () => {
    const ip = "203.0.113.42";

    const h1 = hashIp(ip);
    const h2 = hashIp(ip);

    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different IPs", () => {
    const ip1 = "203.0.113.42";
    const ip2 = "203.0.113.43";

    const h1 = hashIp(ip1);
    const h2 = hashIp(ip2);

    expect(h1).not.toBe(h2);
  });

  it("throws a ReportRateLimitError for an empty IP string", () => {
    expect(() => hashIp("   ")).toThrow(ReportRateLimitError);
  });
});
