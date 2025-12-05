// src/env.ts
import { z } from "zod";

/**
 * Schema describing all server-side environment variables.
 * This is the single source of truth for configuration.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1, {
    message: "DATABASE_URL is required for Prisma and database access",
  }),

  RATE_LIMIT_IP_SALT: z.string().min(32, {
    message: "RATE_LIMIT_IP_SALT must be at least 32 characters long",
  }),

  RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: z.coerce
    .number()
    .int()
    .min(1, {
      message: "RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP must be >= 1",
    })
    .max(5, {
      // Note: keep this relatively low to avoid abuse in production.
      message:
        "RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP must be <= 5 for safety",
    })
    .default(3),

  RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: z.coerce
    .number()
    .int()
    .min(1, {
      message: "RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY must be >= 1",
    })
    .max(20, {
      message: "RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY must be <= 20 for safety",
    })
    .default(10),
});

/**
 * Read and validate process.env once at module load time.
 * Failing fast here prevents hard-to-debug runtime errors later.
 */
const parsed = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  RATE_LIMIT_IP_SALT: process.env.RATE_LIMIT_IP_SALT,
  RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP:
    process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
  RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY:
    process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
});

if (!parsed.success) {
  // We intentionally log and crash early so misconfiguration is obvious.
  console.error("[env] Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment configuration. See error log above.");
}

/**
 * Validated, read-only environment object.
 * Import this instead of reading process.env directly.
 */
export const env = Object.freeze(parsed.data);
export type Env = typeof env;
