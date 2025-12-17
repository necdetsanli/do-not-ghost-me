// tests/unit/rateLimitError.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_RATE_LIMIT_STATUS_CODE,
  MISSING_IP_MESSAGE,
  ReportRateLimitError,
  isReportRateLimitError,
} from "@/lib/rateLimitError";

/**
 * Unit tests for lib/rateLimitError.
 *
 * This module defines the domain-specific error used by the reporting endpoint
 * to represent rate limiting and "fail closed" scenarios (e.g., missing IP).
 *
 * These tests validate:
 * - exported constants
 * - error construction (including prototype chain and defaults)
 * - support for custom status codes
 * - the type guard behavior
 */
describe("lib/rateLimitError", () => {
  /**
   * Ensures exported constants remain stable and usable in downstream code:
   * - DEFAULT_RATE_LIMIT_STATUS_CODE is the canonical HTTP status for rate limits.
   * - MISSING_IP_MESSAGE is a user-facing message and must be non-empty.
   */
  it("exposes constants", () => {
    expect(DEFAULT_RATE_LIMIT_STATUS_CODE).toBe(429);
    expect(typeof MISSING_IP_MESSAGE).toBe("string");
    expect(MISSING_IP_MESSAGE.length > 0).toBe(true);
  });

  /**
   * Ensures ReportRateLimitError behaves like a proper Error subclass:
   * - is instance of Error and ReportRateLimitError
   * - has a stable name for logging/debugging
   * - preserves message/reason
   * - uses the default status code when not provided
   */
  it("constructs with defaults and preserves prototype chain", () => {
    const err = new ReportRateLimitError("x", "unknown");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ReportRateLimitError);
    expect(err.name).toBe("ReportRateLimitError");
    expect(err.message).toBe("x");
    expect(err.reason).toBe("unknown");
    expect(err.statusCode).toBe(DEFAULT_RATE_LIMIT_STATUS_CODE);
  });

  /**
   * Ensures callers can override the default HTTP status code.
   * (Useful for future error types or non-standard responses in tests.)
   */
  it("accepts custom status codes", () => {
    const err = new ReportRateLimitError("x", "daily-ip-limit", 418);
    expect(err.statusCode).toBe(418);
  });

  /**
   * Ensures the type guard correctly identifies ReportRateLimitError instances
   * and rejects unrelated values.
   */
  it("type guard works", () => {
    const err = new ReportRateLimitError("x", "missing-ip");
    expect(isReportRateLimitError(err)).toBe(true);
    expect(isReportRateLimitError(new Error("nope"))).toBe(false);
    expect(isReportRateLimitError("nope")).toBe(false);
  });
});
