// src/lib/validation/reportSchema.ts

import { z } from "zod";
import { Stage, JobLevel, PositionCategory, CountryCode } from "@prisma/client";
import { nameLikeString } from "@/lib/validation/patterns";

/**
 * Zod schema for the public "ghosting report" payload.
 *
 * This schema is the single source of truth for validation and is shared
 * between the API route and any client-side validation logic.
 *
 * Fields:
 * - companyName: human-readable company name (2..120 chars, safe charset)
 * - stage: pipeline stage (enum Stage)
 * - jobLevel: seniority (enum JobLevel)
 * - positionCategory: coarse role category (enum PositionCategory)
 * - positionDetail: short free-text position label (2..80 chars)
 * - daysWithoutReply: integer in [1, 365]
 * - country: ISO 3166-1 alpha-2 country code (enum CountryCode), required
 * - honeypot: hidden anti-bot field, must be empty when present
 */
export const reportSchema = z.object({
  /**
   * Company name as entered by the user.
   * We reuse the generic "name-like" helper to enforce length and charset.
   */
  companyName: nameLikeString(2, 120, "Company name"),

  /**
   * Interview / pipeline stage.
   */
  stage: z.nativeEnum(Stage),

  /**
   * Seniority / job level.
   */
  jobLevel: z.nativeEnum(JobLevel),

  /**
   * Coarse position category (e.g. SOFTWARE_ENGINEERING, DEVOPS_SRE_PLATFORM).
   */
  positionCategory: z.nativeEnum(PositionCategory),

  /**
   * Short free-text description of the position
   * (e.g. "Backend Developer", "Site Reliability Engineer").
   */
  positionDetail: nameLikeString(2, 80, "Position detail"),

  /**
   * Number of days without a reply from the company.
   */
  daysWithoutReply: z.coerce
    .number()
    .int()
    .min(1, { message: "Days without reply must be at least 1" })
    .max(365, { message: "Days without reply must be at most 365" }),

  /**
   * Country where the role / office is located.
   *
   * This is required and must be one of the CountryCode enum values.
   * Zod v4 expects the options object to only contain `error` or `message`,
   * so we use `message` instead of older `required_error` / `errorMap` keys.
   */
  country: z.nativeEnum(CountryCode, {
    message: "Please select a country",
  }),

  /**
   * Honeypot field for bots.
   * Must be empty for a valid submission.
   * Not rendered in the UI for normal users (hidden input).
   */
  honeypot: z.string().max(0).optional(),
});

/**
 * Convenience TypeScript type for a validated report payload.
 */
export type ReportInput = z.infer<typeof reportSchema>;
