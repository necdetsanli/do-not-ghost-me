// tests/unit/errorUtils.test.ts
import { describe, it, expect } from "vitest";
import { formatUnknownError } from "@/lib/errorUtils";

describe("lib/errorUtils", () => {
  it("returns Error.message for Error instances", () => {
    expect(formatUnknownError(new Error("boom"))).toBe("boom");
  });

  it("stringifies non-Error values via String()", () => {
    expect(formatUnknownError("x")).toBe("x");
    expect(formatUnknownError(123)).toBe("123");
    expect(formatUnknownError({ a: 1 })).toBe("[object Object]");
  });

  it("falls back when String() throws", () => {
    const evil = {
      toString(): string {
        throw new Error("nope");
      },
    };

    expect(formatUnknownError(evil)).toBe("[unstringifiable-error]");
  });
});
