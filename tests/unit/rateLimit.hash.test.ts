//tests/unit/rateLimit.hash.test.ts
import { describe, it, expect } from "vitest";
import { hashIp } from "@/lib/rateLimit";
import { ReportRateLimitError } from "@/lib/rateLimitError";

/**
 * Unit tests for the `hashIp` helper.
 *
 * These tests verify that:
 * - the hash is deterministic for a given IP,
 * - different IPs produce different hashes, and
 * - invalid input (empty / whitespace-only IP) results in a
 *   `ReportRateLimitError`.
 */
describe("hashIp", () => {
  /**
   * For the same IP string, `hashIp` must always return the same
   * 64-character hexadecimal digest. This ensures deterministic
   * hashing for use in rate-limit keys and unique indexes.
   */
  it("produces a stable hash for the same IP", () => {
    const ip = "203.0.113.42";

    const h1 = hashIp(ip);
    const h2 = hashIp(ip);

    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  /**
   * Different IP strings must produce different digests, so we do not
   * accidentally collapse distinct clients onto the same hash value.
   */
  it("produces different hashes for different IPs", () => {
    const ip1 = "203.0.113.42";
    const ip2 = "203.0.113.43";

    const h1 = hashIp(ip1);
    const h2 = hashIp(ip2);

    expect(h1).not.toBe(h2);
  });

  /**
   * A whitespace-only IP string is treated as invalid input and should
   * cause `hashIp` to throw a `ReportRateLimitError` rather than
   * silently hashing an empty value.
   */
  it("throws a ReportRateLimitError for an empty IP string", () => {
    expect(() => hashIp("   ")).toThrow(ReportRateLimitError);
  });
});
