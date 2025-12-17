// tests/unit/prismaErrors.test.ts
import { describe, it, expect } from "vitest";
import {
  hasPrismaErrorCode,
  isPrismaUniqueViolation,
} from "@/lib/prismaErrors";

/**
 * Unit tests for lib/prismaErrors.
 *
 * This helper module provides small, type-safe predicates for detecting
 * Prisma error codes without depending on Prisma's runtime error classes.
 */
describe("lib/prismaErrors", () => {
  describe("hasPrismaErrorCode", () => {
    /**
     * Ensures the helper is defensive and never throws for non-object inputs.
     * These cases should always return false.
     */
    it("returns false for non-objects", () => {
      expect(hasPrismaErrorCode(null, "P2002")).toBe(false);
      expect(hasPrismaErrorCode(undefined, "P2002")).toBe(false);
      expect(hasPrismaErrorCode(123, "P2002")).toBe(false);
      expect(hasPrismaErrorCode("x", "P2002")).toBe(false);
    });

    /**
     * Ensures missing or non-string `code` values are treated as not matching.
     */
    it("returns false when code is missing or not a string", () => {
      expect(hasPrismaErrorCode({}, "P2002")).toBe(false);
      expect(hasPrismaErrorCode({ code: 2002 }, "P2002")).toBe(false);
    });

    /**
     * Ensures exact string matching behavior for Prisma error codes.
     */
    it("returns true when code matches", () => {
      expect(hasPrismaErrorCode({ code: "P2002" }, "P2002")).toBe(true);
      expect(hasPrismaErrorCode({ code: "P2003" }, "P2002")).toBe(false);
    });
  });

  describe("isPrismaUniqueViolation", () => {
    /**
     * Ensures the unique-violation predicate recognizes Prisma's P2002 only.
     */
    it("matches P2002 only", () => {
      expect(isPrismaUniqueViolation({ code: "P2002" })).toBe(true);
      expect(isPrismaUniqueViolation({ code: "P2003" })).toBe(false);
    });
  });
});
