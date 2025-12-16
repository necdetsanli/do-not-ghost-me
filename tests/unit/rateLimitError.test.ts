// tests/unit/rateLimitError.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_RATE_LIMIT_STATUS_CODE,
  MISSING_IP_MESSAGE,
  ReportRateLimitError,
  isReportRateLimitError,
} from "@/lib/rateLimitError";

describe("lib/rateLimitError", () => {
  it("exposes constants", () => {
    expect(DEFAULT_RATE_LIMIT_STATUS_CODE).toBe(429);
    expect(typeof MISSING_IP_MESSAGE).toBe("string");
    expect(MISSING_IP_MESSAGE.length > 0).toBe(true);
  });

  it("constructs with defaults and preserves prototype chain", () => {
    const err = new ReportRateLimitError("x", "unknown");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ReportRateLimitError);
    expect(err.name).toBe("ReportRateLimitError");
    expect(err.message).toBe("x");
    expect(err.reason).toBe("unknown");
    expect(err.statusCode).toBe(DEFAULT_RATE_LIMIT_STATUS_CODE);
  });

  it("accepts custom status codes", () => {
    const err = new ReportRateLimitError("x", "daily-ip-limit", 418);
    expect(err.statusCode).toBe(418);
  });

  it("type guard works", () => {
    const err = new ReportRateLimitError("x", "missing-ip");
    expect(isReportRateLimitError(err)).toBe(true);
    expect(isReportRateLimitError(new Error("nope"))).toBe(false);
    expect(isReportRateLimitError("nope")).toBe(false);
  });
});
