// src/env.ts
import { z } from "zod";

/**
 * Schema describing all server-side environment variables.
 * This is the single source of truth for configuration and also
 * enforces cross-variable invariants (for example admin config consistency).
 */
const serverEnvSchema = z
  .object({
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
        // Keep this relatively low to avoid abuse in production.
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
        message:
          "RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY must be <= 20 for safety",
      })
      .default(10),

    /**
     * Optional password for the admin dashboard.
     * When unset, the admin area will not be usable.
     */
    ADMIN_PASSWORD: z.string().min(8).optional(),

    /**
     * Secret used to sign admin session cookies.
     * Must be a long, random string in production.
     */
    ADMIN_SESSION_SECRET: z.string().min(32).optional(),

    /**
     * Optional host restriction for the admin dashboard.
     * Example: "localhost:3000" or "do-not-ghost.me".
     * When set, admin requests from other hosts are rejected.
     */
    ADMIN_ALLOWED_HOST: z.string().optional(),

    /**
     * CSRF secret for the admin login form.
     * Used to derive CSRF tokens; must be long and random in production.
     */
    ADMIN_CSRF_SECRET: z.string().min(32).optional(),
  })
  .superRefine((value, ctx) => {
    const hasAdminPassword =
      typeof value.ADMIN_PASSWORD === "string" &&
      value.ADMIN_PASSWORD.length > 0;
    const hasAdminSessionSecret =
      typeof value.ADMIN_SESSION_SECRET === "string" &&
      value.ADMIN_SESSION_SECRET.length > 0;
    const hasAdminCsrfSecret =
      typeof value.ADMIN_CSRF_SECRET === "string" &&
      value.ADMIN_CSRF_SECRET.length > 0;

    // 1) For security, ADMIN_PASSWORD and ADMIN_SESSION_SECRET must either both be set
    //    or both be omitted. A half-configured admin setup is not allowed.
    if (hasAdminPassword !== hasAdminSessionSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ADMIN_PASSWORD and ADMIN_SESSION_SECRET must either both be set or both be omitted.",
        path: ["ADMIN_PASSWORD"],
      });
    }

    // 2) If admin is configured at all (password + session secret),
    //    require a CSRF secret as well. This avoids enabling admin
    //    with CSRF protection accidentally disabled.
    const isAdminEnabled = hasAdminPassword && hasAdminSessionSecret;

    if (isAdminEnabled && !hasAdminCsrfSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ADMIN_CSRF_SECRET must be set when ADMIN_PASSWORD/ADMIN_SESSION_SECRET are configured.",
        path: ["ADMIN_CSRF_SECRET"],
      });
    }

    // 3) Extra guard for production: prevent shipping with the example
    //    placeholder salt from .env.example (or anything that looks like it).
    if (
      value.NODE_ENV === "production" &&
      value.RATE_LIMIT_IP_SALT.toLowerCase().includes("replace-with")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "RATE_LIMIT_IP_SALT must be a strong random value in production (not the example placeholder).",
        path: ["RATE_LIMIT_IP_SALT"],
      });
    }
  });

/**
 * Read and validate process.env once at module load time.
 * Failing fast here prevents hard-to-debug runtime errors later and avoids
 * starting the application with an insecure or inconsistent configuration.
 */
const parsed = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  RATE_LIMIT_IP_SALT: process.env.RATE_LIMIT_IP_SALT,
  RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP:
    process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
  RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY:
    process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  ADMIN_ALLOWED_HOST: process.env.ADMIN_ALLOWED_HOST,
  ADMIN_CSRF_SECRET: process.env.ADMIN_CSRF_SECRET,
});

if (!parsed.success) {
  // We intentionally log and crash early so misconfiguration is obvious.
  console.error("[env] Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment configuration. See error log above.");
}

/**
 * Validated, read-only environment object.
 * Import this instead of reading process.env directly to keep configuration
 * access centralized and type-safe across the application.
 */
export const env = Object.freeze(parsed.data);
export type Env = typeof env;
