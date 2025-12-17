// tests/unit/validation.patterns.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  NAME_LIKE_REGEX,
  containsAtLeastOneLetter,
  nameLikeString,
} from "@/lib/validation/patterns";

/**
 * Unit tests for lib/validation/patterns.
 *
 * These tests verify:
 * - The allowed/blocked character set for "name-like" inputs (company names, position details, etc.).
 * - A secondary semantic guard that requires at least one unicode letter.
 * - The Zod schema builder behavior (trim, length constraints, and error messages).
 */
describe("lib/validation/patterns", () => {
  /**
   * Validates the low-level character allowlist used for name-like strings.
   *
   * Note:
   * This is intentionally strict to reduce XSS / injection surface area while still
   * supporting typical company naming conventions and international alphabets.
   */
  describe("NAME_LIKE_REGEX", () => {
    /**
     * Ensures typical real-world company-like strings pass:
     * - Unicode letters
     * - Digits
     * - Spaces
     * - A conservative set of safe punctuation/symbols
     */
    it("accepts unicode letters, digits, spaces and allowed safe symbols", () => {
      const value = `R&D (AI/ML) - DevOps+SRE, Inc.#1 "ACME" O'Reilly`;
      expect(NAME_LIKE_REGEX.test(value)).toBe(true);
    });

    /**
     * Ensures clearly unsafe / noisy characters are rejected.
     * (e.g., characters commonly used in emails or HTML contexts)
     */
    it("rejects clearly unsafe characters", () => {
      expect(NAME_LIKE_REGEX.test("ACME@Inc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME!Inc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME:Inc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME<Inc>")).toBe(false);
    });

    /**
     * Ensures only normal spaces are accepted for whitespace.
     * Tabs/newlines are rejected to avoid hidden formatting and log noise.
     */
    it("rejects tabs and newlines (spaces only)", () => {
      expect(NAME_LIKE_REGEX.test("ACME\tInc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME\nInc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME Inc")).toBe(true);
    });
  });

  /**
   * Validates the semantic guard for "must contain at least one letter".
   *
   * This prevents inputs like "12345" or "----" from being accepted even if they
   * technically match the regex allowlist.
   */
  describe("containsAtLeastOneLetter", () => {
    /**
     * Accepts strings that contain at least one unicode letter, including
     * non-Latin alphabets.
     */
    it("returns true when the string contains at least one unicode letter", () => {
      expect(containsAtLeastOneLetter("123a")).toBe(true);
      expect(containsAtLeastOneLetter("İstanbul 34")).toBe(true);
      expect(containsAtLeastOneLetter("Ж")).toBe(true);
      expect(containsAtLeastOneLetter("你好")).toBe(true);
    });

    /**
     * Rejects strings that contain no letters, including whitespace-only input.
     */
    it("returns false when the string has no letters", () => {
      expect(containsAtLeastOneLetter("123456")).toBe(false);
      expect(containsAtLeastOneLetter("----")).toBe(false);
      expect(containsAtLeastOneLetter("   ")).toBe(false);
      expect(containsAtLeastOneLetter("")).toBe(false);
    });
  });

  /**
   * Validates the higher-level Zod schema builder used by multiple inputs.
   *
   * Contract:
   * - Trims input.
   * - Enforces min/max length AFTER trimming.
   * - Enforces allowed characters via NAME_LIKE_REGEX.
   * - Enforces at least one unicode letter via containsAtLeastOneLetter.
   * - Produces stable, user-friendly error messages.
   */
  describe("nameLikeString", () => {
    /**
     * Ensures trimming happens and the parsed output is the trimmed string.
     */
    it("trims the input and returns the trimmed value on success", () => {
      const schema = nameLikeString(2, 50, "Company name");
      const out = schema.parse("  ACME Inc.  ");
      expect(out).toBe("ACME Inc.");
    });

    /**
     * Ensures min length validation is applied after trimming.
     * This avoids accepting inputs that "look long enough" due to leading/trailing spaces.
     */
    it("enforces min length after trimming", () => {
      const schema = nameLikeString(2, 50, "Company name");
      const res = schema.safeParse(" A ");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Company name must be at least 2 characters long");
    });

    /**
     * Ensures max length validation is applied after trimming.
     */
    it("enforces max length after trimming", () => {
      const schema = nameLikeString(1, 5, "Position detail");
      const res = schema.safeParse("abcdef");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Position detail must be at most 5 characters long");
    });

    /**
     * Ensures invalid characters are rejected with a stable error message.
     */
    it("rejects values with invalid characters", () => {
      const schema = nameLikeString(1, 50, "Company name");
      const res = schema.safeParse("ACME@Inc");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Company name contains invalid characters");
    });

    /**
     * Ensures that a "regex-valid" string is still rejected when it contains no letters.
     * This keeps low-information inputs out of the dataset.
     */
    it("rejects values that contain no letters even if regex matches", () => {
      const schema = nameLikeString(1, 50, "Company name");
      const res = schema.safeParse("12345");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Company name must contain at least one letter");
    });

    /**
     * Ensures the factory returns a ZodString schema (not a transformed/unknown type).
     */
    it("returns a ZodString schema", () => {
      const schema = nameLikeString(1, 10, "Company name");
      expect(schema).toBeInstanceOf(z.ZodString);
    });
  });
});
