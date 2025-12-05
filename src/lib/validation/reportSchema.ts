// src/lib/validation/reportSchema.ts
import { z } from "zod";
import { Stage, JobLevel, PositionCategory } from "@prisma/client";
import { COUNTRY_REGEX, nameLikeString } from "@/lib/validation/patterns";

/**
 * Schema for a public report payload.
 * This is the single source of truth for validation on both API and client.
 */
export const reportSchema = z.object({
  companyName: nameLikeString(2, 120, "Company name"),

  stage: z.nativeEnum(Stage),

  jobLevel: z.nativeEnum(JobLevel),

  positionCategory: z.nativeEnum(PositionCategory),

  positionDetail: nameLikeString(2, 80, "Position detail"),

  daysWithoutReply: z.coerce
    .number()
    .int()
    .min(1, { message: "Days without reply must be at least 1" })
    .max(365, { message: "Days without reply must be at most 365" }),

  country: z
    .string()
    .trim()
    .max(100, { message: "Country name must be at most 100 characters long" })
    .regex(COUNTRY_REGEX, {
      message: "Country name contains invalid characters",
    })
    .optional(),

  /**
   * Honeypot field for bots.
   * Must be empty for a valid submission.
   * Not rendered in the UI for normal users.
   */
  honeypot: z.string().max(0).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
