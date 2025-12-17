// tests/unit/errorUtils.test.ts
import { describe, it, expect } from "vitest";
import { formatUnknownError } from "@/lib/errorUtils";

/**
 * Unit tests for lib/errorUtils.formatUnknownError.
 *
 * Verifies the function produces a safe, user/log-friendly string for arbitrary
 * `unknown` errors without ever throwing.
 */
describe("lib/errorUtils", () => {
  /**
   * Ensures Error instances are formatted using their `.message` to preserve
   * the most relevant human-readable detail.
   */
  it("returns Error.message for Error instances", () => {
    expect(formatUnknownError(new Error("boom"))).toBe("boom");
  });

  /**
   * Ensures non-Error values are stringified using `String(value)` so callers
   * always get a string output.
   */
  it("stringifies non-Error values via String()", () => {
    expect(formatUnknownError("x")).toBe("x");
    expect(formatUnknownError(123)).toBe("123");
    expect(formatUnknownError({ a: 1 })).toBe("[object Object]");
  });

  /**
   * Ensures the formatter never throws even when the input's `toString()`
   * implementation is hostile and throws.
   */
  it("falls back when String() throws", () => {
    const evil = {
      /**
       * Simulates a hostile object that throws during stringification.
       *
       * @returns Never returns.
       * @throws {Error} Always throws.
       */
      toString(): string {
        throw new Error("nope");
      },
    };

    expect(formatUnknownError(evil)).toBe("[unstringifiable-error]");
  });
});
