//tests/setup/test-env.ts
import { config as loadEnv } from "dotenv";

/**
 * Test environment bootstrap.
 *
 * This file is loaded before tests and ensures that required
 * environment variables have reasonable defaults so that:
 *  - env.ts validation passes,
 *  - Prisma can construct a client,
 *  - rate limiting code has a long enough salt.
 */
loadEnv();

/**
 * Ensure that a string-valued environment variable is set.
 * If it is missing or empty, a fallback value is assigned.
 */
function ensureEnvVar(name: string, fallback: string): void {
  const current = process.env[name];

  if (current == null || current === "") {
    process.env[name] = fallback;
  }
}

// DATABASE_URL must exist for env.ts + Prisma
ensureEnvVar(
  "DATABASE_URL",
  "postgres://ghostuser:ghostpass@localhost:5432/donotghostme_test",
);

// Safe defaults for rate limit in tests
ensureEnvVar("RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP", "3");
ensureEnvVar("RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY", "10");

// Admin-related env vars so that admin routes are "configured" in tests
ensureEnvVar("ADMIN_PASSWORD", "test-admin-password");
ensureEnvVar("ADMIN_SESSION_SECRET", "change-this-to-a-long-random-string");
// Allow any host during tests (admin host restriction is mocked anyway)
ensureEnvVar("ADMIN_ALLOWED_HOST", "127.0.0.1:3000");

// Salt must be >= 32 characters
if (
  process.env.RATE_LIMIT_IP_SALT == null ||
  process.env.RATE_LIMIT_IP_SALT.length < 32
) {
  process.env.RATE_LIMIT_IP_SALT = "test-salt-should-be-long-enough-1234567890";
}
