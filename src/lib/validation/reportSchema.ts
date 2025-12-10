// src/lib/validation/reportSchema.ts
import { z } from "zod";
import { Stage, JobLevel, PositionCategory, CountryCode } from "@prisma/client";
import { nameLikeString } from "@/lib/validation/patterns";

/**
 * Preprocess the raw value for the optional "daysWithoutReply" field.
 *
 * Behavior:
 * - undefined / null → treated as "not provided" (returns undefined).
 * - empty or whitespace-only string → treated as "not provided".
 * - numeric string → parsed into a number.
 * - number → passed through.
 * - anything else / non-finite → Number.NaN (so the inner schema fails validation).
 *
 * When provided (i.e. not undefined), the value must be an integer between 1 and 365 (inclusive).
 *
 * @param raw - Raw value coming from the request payload (string, number, null or undefined).
 * @returns A normalized number value, or undefined when the field is considered "not provided".
 */
function preprocessDaysWithoutReply(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw === "string") {
    const trimmed: string = raw.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed: number = Number(trimmed);

    if (Number.isFinite(parsed) === false) {
      return Number.NaN;
    }

    return parsed;
  }

  if (typeof raw === "number") {
    return raw;
  }

  return Number.NaN;
}

/**
 * Helper schema for the optional "daysWithoutReply" field.
 *
 * Behavior (after preprocessing):
 * - undefined → field omitted and allowed.
 * - finite number → must be an integer between 1 and 365 (inclusive).
 * - Number.NaN or out of range → validation error.
 */
const daysWithoutReplySchema = z.preprocess(
  preprocessDaysWithoutReply,
  z
    .number()
    .int({
      message: "Days without reply must be an integer number of days",
    })
    .min(1, { message: "Days without reply must be at least 1" })
    .max(365, { message: "Days without reply must be at most 365" })
    .optional(),
);

/**
 * Zod schema for the public "ghosting report" payload.
 *
 * This schema is the single source of truth for validation and is shared
 * between the API route and any client-side validation logic.
 *
 * Fields:
 * - companyName: human-readable company name (2..120 chars, safe charset).
 * - stage: pipeline stage (enum Stage).
 * - jobLevel: seniority (enum JobLevel).
 * - positionCategory: coarse role category (enum PositionCategory).
 * - positionDetail: short free-text position label (2..80 chars).
 * - daysWithoutReply: optional integer in [1, 365] when provided.
 * - country: ISO 3166-1 alpha-2 country code (enum CountryCode), required.
 * - honeypot: hidden anti-bot field, must be empty when present.
 */
export const reportSchema = z.object({
  /**
   * Company name as entered by the user.
   * Uses the generic "name-like" helper to enforce length and charset.
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
   * Optional: users may omit this if they do not remember.
   */
  daysWithoutReply: daysWithoutReplySchema,

  /**
   * Country where the role / office is located.
   *
   * This is required and must be one of the CountryCode enum values.
   */
  country: z.nativeEnum(CountryCode, {
    error: "Please select a valid country",
  }),

  /**
   * Honeypot input must be empty or omitted.
   * Any non-empty value is treated as an invalid submission
   * (typically indicating a bot).
   */
  honeypot: z.string().max(0, { message: "honeypot must be empty" }).optional(),
});

/**
 * Convenience TypeScript type for a validated report payload.
 */
export type ReportInput = z.infer<typeof reportSchema>;
