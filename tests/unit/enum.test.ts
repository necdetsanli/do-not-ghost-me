// tests/unit/enum.test.ts
import { describe, it, expect } from "vitest";
import { PositionCategory, JobLevel, Stage, CountryCode } from "@prisma/client";
import {
  enumToSlug,
  formatEnumLabel,
  labelForCategory,
  labelForJobLevel,
  labelForStage,
  labelForCountry,
  categoryEnumToSlug,
  categorySlugToEnum,
  seniorityEnumToSlug,
  senioritySlugToEnum,
  stageEnumToSlug,
  stageSlugToEnum,
} from "@/lib/enums";

describe("lib/enums", () => {
  it("enumToSlug converts enum strings into hyphen slugs", () => {
    expect(enumToSlug("SALES_MARKETING")).toBe("sales-marketing");
    expect(enumToSlug("IT")).toBe("it");
  });

  it("formatEnumLabel creates a basic title-cased label", () => {
    expect(formatEnumLabel("SALES_MARKETING")).toBe("Sales Marketing");
    expect(formatEnumLabel("IT")).toBe("It");
  });

  it("label helpers return custom labels where available", () => {
    expect(labelForCategory(PositionCategory.SALES_MARKETING)).toBe(
      "Sales & Marketing",
    );
    expect(labelForJobLevel(JobLevel.MID)).toBe("Mid-Level");
    expect(labelForStage(Stage.CV_SCREEN)).toBe("CV Screening");
    expect(labelForCountry(CountryCode.TR)).toBe("Turkey");
  });

  it("label helpers fall back when unknown enum values are provided", () => {
    const unknownCategory = "SOME_NEW_CATEGORY" as unknown as PositionCategory;
    expect(labelForCategory(unknownCategory)).toBe(
      formatEnumLabel("SOME_NEW_CATEGORY"),
    );

    const unknownCountry = "XX" as unknown as CountryCode;
    expect(labelForCountry(unknownCountry)).toBe("XX");
  });

  it("category slug maps are bidirectional", () => {
    const cat = PositionCategory.SALES_MARKETING;

    const slug = categoryEnumToSlug(cat);
    expect(slug).toBe(enumToSlug(cat));

    const back = categorySlugToEnum(slug);
    expect(back).toBe(cat);

    expect(categorySlugToEnum("unknown-slug")).toBeUndefined();
  });

  it("seniority slug maps are bidirectional", () => {
    const level = JobLevel.SENIOR;

    const slug = seniorityEnumToSlug(level);
    expect(slug).toBe(enumToSlug(level));

    const back = senioritySlugToEnum(slug);
    expect(back).toBe(level);

    expect(senioritySlugToEnum("unknown-slug")).toBeUndefined();
  });

  it("stage slug maps are bidirectional", () => {
    const stage = Stage.TECHNICAL;

    const slug = stageEnumToSlug(stage);
    expect(slug).toBe(enumToSlug(stage));

    const back = stageSlugToEnum(slug);
    expect(back).toBe(stage);

    expect(stageSlugToEnum("unknown-slug")).toBeUndefined();
  });
});
