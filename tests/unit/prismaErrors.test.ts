import { describe, it, expect } from "vitest";
import {
  hasPrismaErrorCode,
  isPrismaUniqueViolation,
} from "@/lib/prismaErrors";

describe("lib/prismaErrors", () => {
  describe("hasPrismaErrorCode", () => {
    it("returns false for non-objects", () => {
      expect(hasPrismaErrorCode(null, "P2002")).toBe(false);
      expect(hasPrismaErrorCode(undefined, "P2002")).toBe(false);
      expect(hasPrismaErrorCode(123, "P2002")).toBe(false);
      expect(hasPrismaErrorCode("x", "P2002")).toBe(false);
    });

    it("returns false when code is missing or not a string", () => {
      expect(hasPrismaErrorCode({}, "P2002")).toBe(false);
      expect(hasPrismaErrorCode({ code: 2002 }, "P2002")).toBe(false);
    });

    it("returns true when code matches", () => {
      expect(hasPrismaErrorCode({ code: "P2002" }, "P2002")).toBe(true);
      expect(hasPrismaErrorCode({ code: "P2003" }, "P2002")).toBe(false);
    });
  });

  describe("isPrismaUniqueViolation", () => {
    it("matches P2002 only", () => {
      expect(isPrismaUniqueViolation({ code: "P2002" })).toBe(true);
      expect(isPrismaUniqueViolation({ code: "P2003" })).toBe(false);
    });
  });
});
