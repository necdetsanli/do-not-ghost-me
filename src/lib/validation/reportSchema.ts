// src/lib/validation/reportSchema.ts
import { z } from "zod";
import { Stage, JobLevel, PositionCategory } from "@prisma/client";

// Shared regex for company name and position detail:
// - Allow Unicode letters and digits
// - Allow spaces and a safe set of symbols (/, #, +, -, _, &, (), ', ", ., ,)
const nameLikeRegex = /^[\p{L}\p{N}\s_\-\/&()'",.+#]+$/u;

// Country should only contain letters (Unicode), spaces and a few punctuation marks.
// No digits allowed in country names.
const countryRegex = /^[\p{L}\s\-'.(),]+$/u;

// Helper to enforce "must contain at least one letter"
const mustContainLetter = (value: string): boolean => /\p{L}/u.test(value);

export const reportSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters long")
    .max(120, "Company name must be at most 120 characters long")
    .regex(nameLikeRegex, "Company name contains invalid characters")
    .refine(mustContainLetter, {
      message: "Company name must contain at least one letter",
    }),

  stage: z.nativeEnum(Stage),

  jobLevel: z.nativeEnum(JobLevel),

  positionCategory: z.nativeEnum(PositionCategory),

  positionDetail: z
    .string()
    .trim()
    .min(2, "Position detail must be at least 2 characters long")
    .max(80, "Position detail must be at most 80 characters long")
    .regex(nameLikeRegex, "Position detail contains invalid characters")
    .refine(mustContainLetter, {
      message: "Position detail must contain at least one letter",
    }),

  daysWithoutReply: z.coerce
    .number()
    .int()
    .min(1, "Days without reply must be at least 1")
    .max(365, "Days without reply must be at most 365"),

  country: z
    .string()
    .trim()
    .max(100, "Country name must be at most 100 characters long")
    .regex(countryRegex, "Country name contains invalid characters")
    .optional(),

  // Honeypot field for bots; must be empty for valid submissions
  honeypot: z.string().max(0).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
