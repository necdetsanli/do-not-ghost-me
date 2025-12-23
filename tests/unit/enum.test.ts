// tests/unit/enum.test.ts
import {
  categoryEnumToSlug,
  categorySlugToEnum,
  enumToSlug,
  formatEnumLabel,
  labelForCategory,
  labelForCountry,
  labelForJobLevel,
  labelForStage,
  seniorityEnumToSlug,
  senioritySlugToEnum,
  stageEnumToSlug,
  stageSlugToEnum,
} from "@/lib/enums";
import { CountryCode, JobLevel, PositionCategory, Stage } from "@prisma/client";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for lib/enums utilities.
 *
 * Covers:
 * - generic enum formatting helpers (slug + label)
 * - user-facing label helpers (custom labels + fallbacks)
 * - bidirectional slug<->enum mappings for filter routing
 */
describe("lib/enums", () => {
  /**
   * Ensures enum-like SCREAMING_SNAKE_CASE values can be safely represented
   * as stable URL slugs.
   */
  it("enumToSlug converts enum strings into hyphen slugs", () => {
    expect(enumToSlug("SALES_MARKETING")).toBe("sales-marketing");
    expect(enumToSlug("IT")).toBe("it");
  });

  /**
   * Ensures enum-like strings can be converted into a basic human label
   * (primarily used as a fallback when no custom label exists).
   */
  it("formatEnumLabel creates a basic title-cased label", () => {
    expect(formatEnumLabel("SALES_MARKETING")).toBe("Sales Marketing");
    expect(formatEnumLabel("IT")).toBe("It");
  });

  /**
   * Ensures domain-specific label helpers return known custom labels
   * for key enum values.
   */
  it("label helpers return custom labels where available", () => {
    expect(labelForCategory(PositionCategory.SALES_MARKETING)).toBe("Sales & Marketing");
    expect(labelForJobLevel(JobLevel.MID)).toBe("Mid-Level");
    expect(labelForStage(Stage.CV_SCREEN)).toBe("CV Screening");
    expect(labelForCountry(CountryCode.TR)).toBe("Turkey");
  });

  /**
   * Ensures label helpers fail safely when enums evolve or unknown values are
   * passed (e.g., older clients, newer schema).
   */
  it("label helpers fall back when unknown enum values are provided", () => {
    const unknownCategory = "SOME_NEW_CATEGORY" as unknown as PositionCategory;
    expect(labelForCategory(unknownCategory)).toBe(formatEnumLabel("SOME_NEW_CATEGORY"));

    const unknownCountry = "XX" as unknown as CountryCode;
    expect(labelForCountry(unknownCountry)).toBe("XX");
  });

  /**
   * Ensures category slug mapping is stable and bidirectional for routing and
   * query params, and fails closed for unknown slugs.
   */
  it("category slug maps are bidirectional", () => {
    const cat = PositionCategory.SALES_MARKETING;

    const slug = categoryEnumToSlug(cat);
    expect(slug).toBe(enumToSlug(cat));

    const back = categorySlugToEnum(slug);
    expect(back).toBe(cat);

    expect(categorySlugToEnum("unknown-slug")).toBeUndefined();
  });

  /**
   * Ensures seniority slug mapping is stable and bidirectional for routing and
   * query params, and fails closed for unknown slugs.
   */
  it("seniority slug maps are bidirectional", () => {
    const level = JobLevel.SENIOR;

    const slug = seniorityEnumToSlug(level);
    expect(slug).toBe(enumToSlug(level));

    const back = senioritySlugToEnum(slug);
    expect(back).toBe(level);

    expect(senioritySlugToEnum("unknown-slug")).toBeUndefined();
  });

  /**
   * Ensures stage slug mapping is stable and bidirectional for routing and
   * query params, and fails closed for unknown slugs.
   */
  it("stage slug maps are bidirectional", () => {
    const stage = Stage.TECHNICAL;

    const slug = stageEnumToSlug(stage);
    expect(slug).toBe(enumToSlug(stage));

    const back = stageSlugToEnum(slug);
    expect(back).toBe(stage);

    expect(stageSlugToEnum("unknown-slug")).toBeUndefined();
  });

  /**
   * Ensures formatEnumLabel handles edge cases with empty parts.
   */
  it("formatEnumLabel handles empty parts from consecutive underscores", () => {
    // Double underscore creates an empty part
    const result = formatEnumLabel("__DOUBLE__UNDERSCORE__");
    expect(typeof result).toBe("string");
  });

  /**
   * Ensures formatEnumLabel handles trailing underscore.
   */
  it("formatEnumLabel handles trailing underscore", () => {
    const result = formatEnumLabel("TEST_");
    expect(result).toBe("Test ");
  });

  /**
   * Ensures formatEnumLabel handles leading underscore.
   */
  it("formatEnumLabel handles leading underscore", () => {
    const result = formatEnumLabel("_LEADING");
    expect(result).toBe(" Leading");
  });
});
