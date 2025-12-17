// tests/unit/normalization.test.ts
import { describe, it, expect } from "vitest";
import { normalizeCompanyName } from "@/lib/normalization";

/**
 * Unit tests for lib/normalization.normalizeCompanyName.
 *
 * This utility generates a stable, comparable "normalized name" key used for:
 * - case/spacing-insensitive matching,
 * - deduplication,
 * - consistent sorting/grouping.
 *
 * The function is expected to be conservative and deterministic.
 */
describe("lib/normalization.normalizeCompanyName", () => {
  /**
   * Ensures normalization:
   * - trims surrounding whitespace,
   * - lowercases,
   * - removes separators and non-alphanumeric symbols,
   * resulting in a compact comparable key.
   */
  it("trims, lowercases, and removes non letters/digits", () => {
    expect(normalizeCompanyName("  ACME   Corp ")).toBe("acmecorp");
    expect(normalizeCompanyName("Acme-Corp")).toBe("acmecorp");
    expect(normalizeCompanyName("ACME/CORP")).toBe("acmecorp");
  });

  /**
   * Ensures Unicode normalization uses NFKC so visually equivalent strings
   * (e.g. fullwidth characters) normalize to the same key.
   */
  it("normalizes Unicode using NFKC (e.g. fullwidth characters)", () => {
    expect(normalizeCompanyName("ＡＣＭＥ")).toBe("acme");
  });

  /**
   * Ensures non-ASCII letters and digits are preserved (not stripped),
   * enabling international company names to normalize correctly.
   */
  it("keeps Unicode letters and digits", () => {
    expect(normalizeCompanyName("  Çalışma 123 ")).toBe("çalışma123");
  });

  /**
   * Ensures empty/whitespace-only inputs normalize to an empty key.
   */
  it("returns empty string when trimmed input is empty", () => {
    expect(normalizeCompanyName("   ")).toBe("");
  });

  /**
   * Ensures inputs that contain no usable letters/digits after stripping
   * normalize to an empty key rather than throwing or returning junk.
   */
  it("returns empty string when nothing usable remains after stripping", () => {
    expect(normalizeCompanyName("!!! --- ???")).toBe("");
  });
});
