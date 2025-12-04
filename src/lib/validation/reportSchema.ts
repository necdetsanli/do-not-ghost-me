// src/lib/validation/reportSchema.ts
import { z } from "zod";
import { Stage, JobLevel, PositionCategory } from "@prisma/client";

// Allow letters (including Unicode), digits, spaces and a safe set of symbols
const companyNameRegex = /^[\p{L}\p{N}\s\-_/&()'",.]+$/u;
const positionDetailRegex = /^[\p{L}\p{N}\s\-_/&()'",.]+$/u;

export const reportSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters long")
    .max(120, "Company name must be at most 120 characters long")
    .regex(companyNameRegex, "Company name contains invalid characters"),

  stage: z.nativeEnum(Stage),

  jobLevel: z.nativeEnum(JobLevel),

  positionCategory: z.nativeEnum(PositionCategory),

  positionDetail: z
    .string()
    .trim()
    .min(2, "Position detail must be at least 2 characters long")
    .max(80, "Position detail must be at most 80 characters long")
    .regex(positionDetailRegex, "Position detail contains invalid characters"),

  daysWithoutReply: z.coerce
    .number()
    .int()
    .min(1, "Days without reply must be at least 1")
    .max(365, "Days without reply must be at most 365"),

  country: z
    .string()
    .trim()
    .max(100, "Country name must be at most 100 characters long")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  // Honeypot field for bots; must be empty for valid submissions
  honeypot: z.string().optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
