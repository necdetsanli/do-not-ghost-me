// tests/setup/test-env.ts

import { config as loadEnv } from "dotenv";

// Load .env or .env.test if you want
loadEnv();

// tests/setup/test-env.ts

// DATABASE_URL must exist for env.ts + Prisma
if (process.env.DATABASE_URL == null || process.env.DATABASE_URL === "") {
  process.env.DATABASE_URL =
    "postgres://ghostuser:ghostpass@localhost:5432/donotghostme_test";
}

// Safe defaults for rate limit in tests
if (
  process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP == null ||
  process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP === ""
) {
  process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "3";
}

if (
  process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY == null ||
  process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY === ""
) {
  process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "10";
}

// Salt must be >= 32 chars
if (
  process.env.RATE_LIMIT_IP_SALT == null ||
  process.env.RATE_LIMIT_IP_SALT.length < 32
) {
  process.env.RATE_LIMIT_IP_SALT = "test-salt-should-be-long-enough-1234567890";
}
