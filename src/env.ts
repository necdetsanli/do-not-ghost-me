// src/env.ts
import { z } from "zod";

/**
 * Parse an integer-like environment value safely.
 *
 * - Accepts number or string.
 * - Treats empty strings as "unset" (so defaults can apply).
 */
function intFromEnv(args: {
  varName: string;
  min: number;
  max: number;
  defaultValue: number;
}): z.ZodType<number> {
  return z.preprocess(
    (value: unknown) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return undefined;
        }
        return Number(trimmed);
      }
      return value;
    },
    z
      .number({
        message: `${args.varName} must be a number`,
      })
      .int(`${args.varName} must be an integer`)
      .min(args.min, {
        message: `${args.varName} must be >= ${String(args.min)}`,
      })
      .max(args.max, {
        message: `${args.varName} must be <= ${String(args.max)}`,
      })
      .default(args.defaultValue),
  );
}

/**
 * Parse a boolean-like environment value safely.
 *
 * Accepts:
 * - true/false boolean
 * - "true"/"false" strings (case-insensitive, trimmed)
 */
function boolFromEnv(args: { varName: string; defaultValue: boolean }): z.ZodType<boolean> {
  return z.preprocess(
    (value: unknown) => {
      if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed.length === 0) {
          return undefined;
        }
        if (trimmed === "true") {
          return true;
        }
        if (trimmed === "false") {
          return false;
        }
      }
      return value;
    },
    z
      .boolean({
        message: `${args.varName} must be "true" or "false"`,
      })
      .default(args.defaultValue),
  );
}

/**
 * Base schema describing all server-side environment variables.
 * This schema is extended with cross-field invariants using superRefine.
 */
const baseServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, {
    message: "DATABASE_URL is required for Prisma and database access",
  }),

  RATE_LIMIT_IP_SALT: z.string().min(32, {
    message: "RATE_LIMIT_IP_SALT must be at least 32 characters long",
  }),

  RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: intFromEnv({
    varName: "RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP",
    min: 1,
    max: 5,
    defaultValue: 3,
  }),

  RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: intFromEnv({
    varName: "RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY",
    min: 1,
    max: 20,
    defaultValue: 10,
  }),

  /**
   * Rate limit for company search endpoint (req/min).
   * 60 req/min is generous for autocomplete usage patterns.
   */
  RATE_LIMIT_COMPANY_SEARCH_MAX_REQUESTS: intFromEnv({
    varName: "RATE_LIMIT_COMPANY_SEARCH_MAX_REQUESTS",
    min: 10,
    max: 200,
    defaultValue: 60,
  }),

  /**
   * Rate limit window for company search in milliseconds.
   */
  RATE_LIMIT_COMPANY_SEARCH_WINDOW_MS: intFromEnv({
    varName: "RATE_LIMIT_COMPANY_SEARCH_WINDOW_MS",
    min: 10_000,
    max: 300_000,
    defaultValue: 60_000,
  }),

  /**
   * Rate limit for reports stats endpoint (req/min).
   * Lower than search since stats queries are more expensive.
   */
  RATE_LIMIT_REPORTS_STATS_MAX_REQUESTS: intFromEnv({
    varName: "RATE_LIMIT_REPORTS_STATS_MAX_REQUESTS",
    min: 5,
    max: 100,
    defaultValue: 30,
  }),

  /**
   * Rate limit window for reports stats in milliseconds.
   */
  RATE_LIMIT_REPORTS_STATS_WINDOW_MS: intFromEnv({
    varName: "RATE_LIMIT_REPORTS_STATS_WINDOW_MS",
    min: 10_000,
    max: 300_000,
    defaultValue: 60_000,
  }),

  /**
   * Public API: Company intel (browser extension)
   */
  COMPANY_INTEL_ENFORCE_K_ANONYMITY: boolFromEnv({
    varName: "COMPANY_INTEL_ENFORCE_K_ANONYMITY",
    defaultValue: false,
  }),

  COMPANY_INTEL_K_ANONYMITY: intFromEnv({
    varName: "COMPANY_INTEL_K_ANONYMITY",
    min: 2,
    max: 50,
    defaultValue: 5,
  }),

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
   * Example: "localhost:3000" or "www.donotghostme.com".
   * When set, admin requests from other hosts are rejected.
   */
  ADMIN_ALLOWED_HOST: z.string().optional(),

  /**
   * CSRF secret for the admin login form.
   * Used to derive CSRF tokens; must be long and random in production.
   */
  ADMIN_CSRF_SECRET: z.string().min(32).optional(),
});

/**
 * Cross-field invariants for environment variables.
 */
function applyEnvInvariants(
  value: z.infer<typeof baseServerEnvSchema>,
  ctx: z.RefinementCtx,
): void {
  const hasAdminPassword: boolean =
    typeof value.ADMIN_PASSWORD === "string" && value.ADMIN_PASSWORD.length > 0;
  const hasAdminSessionSecret: boolean =
    typeof value.ADMIN_SESSION_SECRET === "string" && value.ADMIN_SESSION_SECRET.length > 0;
  const hasAdminCsrfSecret: boolean =
    typeof value.ADMIN_CSRF_SECRET === "string" && value.ADMIN_CSRF_SECRET.length > 0;

  // Admin config must be all-or-nothing.
  if (hasAdminPassword !== hasAdminSessionSecret) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "ADMIN_PASSWORD and ADMIN_SESSION_SECRET must either both be set or both be omitted.",
      path: ["ADMIN_PASSWORD"],
    });
  }

  const isAdminEnabled: boolean = hasAdminPassword === true && hasAdminSessionSecret === true;

  if (isAdminEnabled === true && hasAdminCsrfSecret === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "ADMIN_CSRF_SECRET must be set when ADMIN_PASSWORD/ADMIN_SESSION_SECRET are configured.",
      path: ["ADMIN_CSRF_SECRET"],
    });
  }

  // Guard: do not ship placeholder salts in production.
  const isProduction: boolean = value.NODE_ENV === "production";
  const saltLooksLikePlaceholder: boolean =
    value.RATE_LIMIT_IP_SALT.toLowerCase().includes("replace-with") === true;

  if (isProduction === true && saltLooksLikePlaceholder === true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "RATE_LIMIT_IP_SALT must be a strong random value in production (not the example placeholder).",
      path: ["RATE_LIMIT_IP_SALT"],
    });
  }

  // Company intel invariants: if enforced, K must be sensible (already min/max validated)
  const enforceK: boolean = value.COMPANY_INTEL_ENFORCE_K_ANONYMITY === true;
  if (enforceK === true && value.COMPANY_INTEL_K_ANONYMITY < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "COMPANY_INTEL_K_ANONYMITY must be >= 2 when enforcement is on.",
      path: ["COMPANY_INTEL_K_ANONYMITY"],
    });
  }
}

const serverEnvSchema = baseServerEnvSchema.superRefine(applyEnvInvariants);

/**
 * Read and validate process.env once at module load time.
 *
 * This function explicitly maps each expected environment variable from `process.env`
 * to the Zod schema. Any new env var added to `baseServerEnvSchema` must also be
 * added here for it to be parsed and validated.
 *
 * @returns The validated, typed environment object.
 * @throws Error if any required env var is missing or invalid.
 */
function parseServerEnv(): z.infer<typeof serverEnvSchema> {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    RATE_LIMIT_IP_SALT: process.env.RATE_LIMIT_IP_SALT,
    RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP:
      process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
    RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
    RATE_LIMIT_COMPANY_SEARCH_MAX_REQUESTS: process.env.RATE_LIMIT_COMPANY_SEARCH_MAX_REQUESTS,
    RATE_LIMIT_COMPANY_SEARCH_WINDOW_MS: process.env.RATE_LIMIT_COMPANY_SEARCH_WINDOW_MS,
    RATE_LIMIT_REPORTS_STATS_MAX_REQUESTS: process.env.RATE_LIMIT_REPORTS_STATS_MAX_REQUESTS,
    RATE_LIMIT_REPORTS_STATS_WINDOW_MS: process.env.RATE_LIMIT_REPORTS_STATS_WINDOW_MS,
    COMPANY_INTEL_ENFORCE_K_ANONYMITY: process.env.COMPANY_INTEL_ENFORCE_K_ANONYMITY,
    COMPANY_INTEL_K_ANONYMITY: process.env.COMPANY_INTEL_K_ANONYMITY,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    ADMIN_ALLOWED_HOST: process.env.ADMIN_ALLOWED_HOST,
    ADMIN_CSRF_SECRET: process.env.ADMIN_CSRF_SECRET,
  });

  if (parsed.success === false) {
    const err = parsed.error as z.ZodError;
    // Fail fast: misconfiguration should be obvious and non-silent.
    console.error("[env] Invalid environment variables:", err.format());
    throw new Error("Invalid environment configuration. See error log above.");
  }

  return parsed.data;
}

/**
 * Validated, read-only environment object.
 */
export const env = Object.freeze(parseServerEnv());
export type Env = typeof env;
