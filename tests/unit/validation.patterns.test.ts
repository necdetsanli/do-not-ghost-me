// tests/unit/validation.patterns.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  NAME_LIKE_REGEX,
  containsAtLeastOneLetter,
  nameLikeString,
} from "@/lib/validation/patterns";

describe("lib/validation/patterns", () => {
  describe("NAME_LIKE_REGEX", () => {
    it("accepts unicode letters, digits, spaces and allowed safe symbols", () => {
      const value = `R&D (AI/ML) - DevOps+SRE, Inc.#1 "ACME" O'Reilly`;
      expect(NAME_LIKE_REGEX.test(value)).toBe(true);
    });

    it("rejects clearly unsafe characters", () => {
      expect(NAME_LIKE_REGEX.test("ACME@Inc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME!Inc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME:Inc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME<Inc>")).toBe(false);
    });

    it("rejects tabs and newlines (spaces only)", () => {
      expect(NAME_LIKE_REGEX.test("ACME\tInc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME\nInc")).toBe(false);
      expect(NAME_LIKE_REGEX.test("ACME Inc")).toBe(true);
    });
  });

  describe("containsAtLeastOneLetter", () => {
    it("returns true when the string contains at least one unicode letter", () => {
      expect(containsAtLeastOneLetter("123a")).toBe(true);
      expect(containsAtLeastOneLetter("İstanbul 34")).toBe(true);
      expect(containsAtLeastOneLetter("Ж")).toBe(true);
      expect(containsAtLeastOneLetter("你好")).toBe(true);
    });

    it("returns false when the string has no letters", () => {
      expect(containsAtLeastOneLetter("123456")).toBe(false);
      expect(containsAtLeastOneLetter("----")).toBe(false);
      expect(containsAtLeastOneLetter("   ")).toBe(false);
      expect(containsAtLeastOneLetter("")).toBe(false);
    });
  });

  describe("nameLikeString", () => {
    it("trims the input and returns the trimmed value on success", () => {
      const schema = nameLikeString(2, 50, "Company name");
      const out = schema.parse("  ACME Inc.  ");
      expect(out).toBe("ACME Inc.");
    });

    it("enforces min length after trimming", () => {
      const schema = nameLikeString(2, 50, "Company name");
      const res = schema.safeParse(" A ");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Company name must be at least 2 characters long");
    });

    it("enforces max length after trimming", () => {
      const schema = nameLikeString(1, 5, "Position detail");
      const res = schema.safeParse("abcdef");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Position detail must be at most 5 characters long");
    });

    it("rejects values with invalid characters", () => {
      const schema = nameLikeString(1, 50, "Company name");
      const res = schema.safeParse("ACME@Inc");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Company name contains invalid characters");
    });

    it("rejects values that contain no letters even if regex matches", () => {
      const schema = nameLikeString(1, 50, "Company name");
      const res = schema.safeParse("12345");
      expect(res.success).toBe(false);

      const message: string | undefined =
        res.success === false ? res.error.issues[0]?.message : undefined;

      expect(message).toBe("Company name must contain at least one letter");
    });

    it("returns a ZodString schema", () => {
      const schema = nameLikeString(1, 10, "Company name");
      expect(schema).toBeInstanceOf(z.ZodString);
    });
  });
});
