// tests/setup/test-env.ts

import { config as loadEnv } from "dotenv";

// Load .env or .env.test if you want
loadEnv();

/**
 * Ensure that DATABASE_URL is defined for tests.
 * We do not actually connect to the DB in unit tests,
 * but db.ts requires this to be present at module load time.
 */
if (process.env.DATABASE_URL == null || process.env.DATABASE_URL === "") {
  process.env.DATABASE_URL =
    "postgres://ghostuser:ghostpass@localhost:5432/donotghostme_test";
}

/**
 * Ensure RATE_LIMIT_IP_SALT is defined so hashIp behaves deterministically.
 */
if (
  process.env.RATE_LIMIT_IP_SALT == null ||
  process.env.RATE_LIMIT_IP_SALT.length < 16
) {
  process.env.RATE_LIMIT_IP_SALT = "test-only-rate-limit-ip-salt-change-me";
}
