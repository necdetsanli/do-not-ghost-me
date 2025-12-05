// src/lib/enums.ts
// Shared enum helpers for labels and URL slugs.

import { PositionCategory, JobLevel, Stage } from "@prisma/client";

/**
 * Convert an enum value (e.g. "DEVOPS_SRE_PLATFORM") to a URL-safe slug
 * (e.g. "devops-sre-platform").
 */
export function enumToSlug(value: string): string {
  return value.toLowerCase().replace(/_/g, "-");
}

/**
 * Convert an enum value (e.g. "DEVOPS_SRE_PLATFORM") to a human-readable label
 * (e.g. "Devops Sre Platform").
 *
 * Note: For nicer labels, we usually override this with custom maps below.
 */
export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Base enum value arrays
// ---------------------------------------------------------------------------

export const POSITION_CATEGORY_OPTIONS = Object.values(
  PositionCategory,
) as PositionCategory[];

export const JOB_LEVEL_OPTIONS = Object.values(JobLevel) as JobLevel[];

export const STAGE_OPTIONS = Object.values(Stage) as Stage[];

// ---------------------------------------------------------------------------
// Custom labels (override maps)
// ---------------------------------------------------------------------------

const POSITION_CATEGORY_LABELS: Partial<Record<PositionCategory, string>> = {
  [PositionCategory.DEVOPS_SRE_PLATFORM]: "DevOps/SRE/Platform",
  [PositionCategory.SOFTWARE_ENGINEERING]: "Software Engineering",
  [PositionCategory.CLOUD_INFRA]: "Cloud/Infrastructure",
  [PositionCategory.DATA_ML_AI]: "Data/ML/AI",
  [PositionCategory.DESIGN]: "Design",
  [PositionCategory.EMBEDDED_ROBOTICS]: "Embedded/Robotics/IoT",
  [PositionCategory.MOBILE]: "Mobile",
  [PositionCategory.OTHER]: "Other",
  [PositionCategory.PRODUCT]: "Product",
  [PositionCategory.QA_TEST]: "QA/Test",
  [PositionCategory.SECURITY]: "Security",
};

const JOB_LEVEL_LABELS: Partial<Record<JobLevel, string>> = {
  [JobLevel.INTERN]: "Intern",
  [JobLevel.JUNIOR]: "Junior",
  [JobLevel.MID]: "Mid-Level",
  [JobLevel.SENIOR]: "Senior",
  [JobLevel.LEAD]: "Lead",
  [JobLevel.OTHER]: "Other",
};

const STAGE_LABELS: Partial<Record<Stage, string>> = {
  [Stage.CV_SCREEN]: "CV Screening",
  [Stage.FIRST_INTERVIEW]: "First Interview",
  [Stage.TECHNICAL]: "Technical Interview",
  [Stage.HR_INTERVIEW]: "HR Interview",
  [Stage.OFFER]: "Offer",
  [Stage.OTHER]: "Other",
};

// ---------------------------------------------------------------------------
// Public label helpers
// ---------------------------------------------------------------------------

/**
 * Human-readable label for a given PositionCategory.
 * Falls back to a generic formatter if not explicitly mapped.
 */
export function labelForCategory(cat: PositionCategory): string {
  return POSITION_CATEGORY_LABELS[cat] ?? formatEnumLabel(cat);
}

/**
 * Human-readable label for a given JobLevel.
 * Falls back to a generic formatter if not explicitly mapped.
 */
export function labelForJobLevel(level: JobLevel): string {
  return JOB_LEVEL_LABELS[level] ?? formatEnumLabel(level);
}

/**
 * Human-readable label for a given Stage.
 * Falls back to a generic formatter if not explicitly mapped.
 */
export function labelForStage(stage: Stage): string {
  return STAGE_LABELS[stage] ?? formatEnumLabel(stage);
}

// ---------------------------------------------------------------------------
// Generic slug-map builder
// ---------------------------------------------------------------------------

/**
 * Build bidirectional slug maps for a set of enum values.
 *
 * enumValue -> slug   (e.g. "DEVOPS_SRE_PLATFORM" -> "devops-sre-platform")
 * slug      -> enum   (e.g. "devops-sre-platform" -> "DEVOPS_SRE_PLATFORM")
 */
function buildSlugMaps<E extends string>(
  values: readonly E[],
): {
  enumToSlug: Record<E, string>;
  slugToEnum: Record<string, E>;
} {
  const enumToSlugMap = {} as Record<E, string>;
  const slugToEnumMap: Record<string, E> = {};

  for (const value of values) {
    const slug = enumToSlug(value);
    enumToSlugMap[value] = slug;
    slugToEnumMap[slug] = value;
  }

  return {
    enumToSlug: enumToSlugMap,
    slugToEnum: slugToEnumMap,
  };
}

// ---------------------------------------------------------------------------
// Slug maps for PositionCategory (category filters in URLs)
// ---------------------------------------------------------------------------

const CATEGORY_SLUG_MAPS = buildSlugMaps(POSITION_CATEGORY_OPTIONS);

export function categoryEnumToSlug(cat: PositionCategory): string {
  return CATEGORY_SLUG_MAPS.enumToSlug[cat];
}

export function categorySlugToEnum(slug: string): PositionCategory | undefined {
  return CATEGORY_SLUG_MAPS.slugToEnum[slug];
}

// ---------------------------------------------------------------------------
// Slug maps for JobLevel (seniority filters in URLs)
// ---------------------------------------------------------------------------

const SENIORITY_SLUG_MAPS = buildSlugMaps(JOB_LEVEL_OPTIONS);

export function seniorityEnumToSlug(level: JobLevel): string {
  return SENIORITY_SLUG_MAPS.enumToSlug[level];
}

export function senioritySlugToEnum(slug: string): JobLevel | undefined {
  return SENIORITY_SLUG_MAPS.slugToEnum[slug];
}

// ---------------------------------------------------------------------------
// Slug maps for Stage (pipeline stage filters in URLs)
// ---------------------------------------------------------------------------

const STAGE_SLUG_MAPS = buildSlugMaps(STAGE_OPTIONS);

export function stageEnumToSlug(stage: Stage): string {
  return STAGE_SLUG_MAPS.enumToSlug[stage];
}

export function stageSlugToEnum(slug: string): Stage | undefined {
  return STAGE_SLUG_MAPS.slugToEnum[slug];
}
