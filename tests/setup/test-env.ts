// tests/setup/test-env.ts
import { config as loadEnv } from "dotenv";

/**
 * Test environment bootstrap.
 *
 * This file is loaded before tests and ensures that required
 * environment variables have reasonable defaults so that:
 *  - env.ts validation passes,
 *  - Prisma can construct a client,
 *  - rate limiting code has a long enough salt,
 *  - admin env invariants are satisfied in tests.
 */
loadEnv();

/**
 * Ensure that a string-valued environment variable is set.
 * If it is missing or empty, a fallback value is assigned.
 *
 * @param name - Environment variable name.
 * @param fallback - Fallback value when missing/empty.
 * @returns void
 */
function ensureEnvVar(name: string, fallback: string): void {
  const current = process.env[name];

  if (current == null || current === "") {
    process.env[name] = fallback;
  }
}

/**
 * Prefer TEST_DATABASE_URL for tests if provided.
 * This allows running real DB tests without Docker/testcontainers.
 */
const testDbUrlRaw = process.env.TEST_DATABASE_URL;
const testDbUrl = typeof testDbUrlRaw === "string" ? testDbUrlRaw.trim() : "";

if (testDbUrl.length > 0) {
  process.env.DATABASE_URL = testDbUrl;
}

// DATABASE_URL must exist for env.ts + Prisma
ensureEnvVar(
  "DATABASE_URL",
  "postgresql://ghostuser:ghostpass@localhost:5432/donotghostme_test",
);

// Safe defaults for rate limit in tests
ensureEnvVar("RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP", "3");
ensureEnvVar("RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY", "10");

// Salt must be >= 32 characters
const salt = process.env.RATE_LIMIT_IP_SALT;
if (salt == null || salt.length < 32) {
  process.env.RATE_LIMIT_IP_SALT = "test-salt-should-be-long-enough-1234567890";
}

// Admin-related env vars so that admin routes are "configured" in tests.
// IMPORTANT: Your env.ts invariants require ADMIN_CSRF_SECRET when admin is enabled.
ensureEnvVar("ADMIN_PASSWORD", "test-admin-password");
ensureEnvVar(
  "ADMIN_SESSION_SECRET",
  "test-admin-session-secret-32-bytes-minimum-0000000",
);
ensureEnvVar(
  "ADMIN_CSRF_SECRET",
  "test-admin-csrf-secret-32-bytes-minimum-000000000",
);

delete process.env.ADMIN_ALLOWED_HOST;
