// src/lib/enums.ts
// Shared enum helpers for labels and slugs

import { PositionCategory, JobLevel, Stage } from "@prisma/client";

// Generic helpers
export function enumToSlug(value: string): string {
  return value.toLowerCase().replace(/_/g, "-");
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Base enum value arrays
export const POSITION_CATEGORY_OPTIONS = Object.values(
  PositionCategory,
) as PositionCategory[];

export const JOB_LEVEL_OPTIONS = Object.values(JobLevel) as JobLevel[];

export const STAGE_OPTIONS = Object.values(Stage) as Stage[];

// Custom labels (override map)
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
  [Stage.CV_SCREEN]: "CV Screen",
  [Stage.FIRST_INTERVIEW]: "First Interview",
  [Stage.TECHNICAL]: "Technical Interview",
  [Stage.HR_INTERVIEW]: "HR Interview",
  [Stage.OFFER]: "Offer",
  [Stage.OTHER]: "Other",
};

// Public label helpers
export function labelForCategory(cat: PositionCategory): string {
  return POSITION_CATEGORY_LABELS[cat] ?? formatEnumLabel(cat);
}

export function labelForJobLevel(level: JobLevel): string {
  return JOB_LEVEL_LABELS[level] ?? formatEnumLabel(level);
}

export function labelForStage(stage: Stage): string {
  return STAGE_LABELS[stage] ?? formatEnumLabel(stage);
}

// Slug maps for categories
const CATEGORY_ENUM_TO_SLUG_INTERNAL: Record<PositionCategory, string> =
  POSITION_CATEGORY_OPTIONS.reduce(
    (acc, value) => {
      acc[value] = enumToSlug(value);
      return acc;
    },
    {} as Record<PositionCategory, string>,
  );

const CATEGORY_SLUG_TO_ENUM_INTERNAL: Record<string, PositionCategory> =
  POSITION_CATEGORY_OPTIONS.reduce(
    (acc, value) => {
      const slug = enumToSlug(value);
      acc[slug] = value;
      return acc;
    },
    {} as Record<string, PositionCategory>,
  );

export function categoryEnumToSlug(cat: PositionCategory): string {
  return CATEGORY_ENUM_TO_SLUG_INTERNAL[cat];
}

export function categorySlugToEnum(slug: string): PositionCategory | undefined {
  return CATEGORY_SLUG_TO_ENUM_INTERNAL[slug];
}

// Slug maps for seniority (job level)
const SENIORITY_ENUM_TO_SLUG_INTERNAL: Record<JobLevel, string> =
  JOB_LEVEL_OPTIONS.reduce(
    (acc, value) => {
      acc[value] = enumToSlug(value);
      return acc;
    },
    {} as Record<JobLevel, string>,
  );

const SENIORITY_SLUG_TO_ENUM_INTERNAL: Record<string, JobLevel> =
  JOB_LEVEL_OPTIONS.reduce(
    (acc, value) => {
      const slug = enumToSlug(value);
      acc[slug] = value;
      return acc;
    },
    {} as Record<string, JobLevel>,
  );

export function seniorityEnumToSlug(level: JobLevel): string {
  return SENIORITY_ENUM_TO_SLUG_INTERNAL[level];
}

export function senioritySlugToEnum(slug: string): JobLevel | undefined {
  return SENIORITY_SLUG_TO_ENUM_INTERNAL[slug];
}

// Slug maps for Stage

const STAGE_ENUM_TO_SLUG_INTERNAL: Record<Stage, string> =
  STAGE_OPTIONS.reduce((acc, value) => {
    acc[value] = enumToSlug(value);
    return acc;
  }, {} as Record<Stage, string>);

const STAGE_SLUG_TO_ENUM_INTERNAL: Record<string, Stage> =
  STAGE_OPTIONS.reduce((acc, value) => {
    const slug = enumToSlug(value);
    acc[slug] = value;
    return acc;
  }, {} as Record<string, Stage>);

export function stageEnumToSlug(stage: Stage): string {
  return STAGE_ENUM_TO_SLUG_INTERNAL[stage];
}

export function stageSlugToEnum(slug: string): Stage | undefined {
  return STAGE_SLUG_TO_ENUM_INTERNAL[slug];
}