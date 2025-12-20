// tests/setup/test-env.ts
import { config as loadEnv } from "dotenv";

/**
 * Test environment bootstrap.
 *
 * Goals:
 * - Avoid accidentally loading development/production env from `.env`.
 * - Provide sane defaults so `src/env.ts` validation passes in tests.
 * - Keep admin "disabled by default" globally (admin tests already stub env per-test).
 *
 * Loading order:
 * - .env.test
 * - .env.test.local (overrides .env.test)
 */
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env.test.local", override: true });

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

  if (typeof current !== "string" || current.trim().length === 0) {
    process.env[name] = fallback;
  }
}

// Ensure tests run with a predictable NODE_ENV
ensureEnvVar("NODE_ENV", "test");

/**
 * Prefer TEST_DATABASE_URL for tests if provided.
 * This allows running tests against a real DB without changing the app config.
 */
const testDbUrlRaw = process.env.TEST_DATABASE_URL;
const testDbUrl = typeof testDbUrlRaw === "string" ? testDbUrlRaw.trim() : "";

if (testDbUrl.length > 0) {
  process.env.DATABASE_URL = testDbUrl;
}

// DATABASE_URL must exist for env.ts + Prisma to initialize
ensureEnvVar("DATABASE_URL", "postgresql://ghostuser:ghostpass@localhost:5432/donotghostme_test");

// Safe defaults for rate limit vars (strings; env.ts parses them)
ensureEnvVar("RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP", "3");
ensureEnvVar("RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY", "10");

// Salt must be >= 32 characters for hashing
const salt = process.env.RATE_LIMIT_IP_SALT;
if (typeof salt !== "string" || salt.length < 32) {
  process.env.RATE_LIMIT_IP_SALT = "test-salt-should-be-long-enough-1234567890";
}

/**
 * IMPORTANT:
 * Keep admin disabled by default at global test bootstrap level.
 *
 * Your admin integration tests already use `vi.stubEnv(...)` + `vi.resetModules()`
 * to enable admin only within those tests.
 */
delete process.env.ADMIN_PASSWORD;
delete process.env.ADMIN_SESSION_SECRET;
delete process.env.ADMIN_CSRF_SECRET;
delete process.env.ADMIN_ALLOWED_HOST;
