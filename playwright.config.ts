// playwright.config.ts
import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "./tests/testUtils/testSecrets";

const DEFAULT_PORT = 3000;
const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}`;

const BASE_URL: string = process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
const baseUrlObj = new URL(BASE_URL);

const PORT: number = Number(baseUrlObj.port || String(DEFAULT_PORT));
const ADMIN_ALLOWED_HOST: string = baseUrlObj.host;

const IS_COVERAGE: boolean = process.env.PW_COLLECT_V8_COVERAGE === "1";
const WEB_SERVER_COMMAND: string =
  IS_COVERAGE === true ? "npm run build && npm run start" : "npm run dev";

/**
 * Generates a cryptographically strong random hex string.
 *
 * @param {number} bytes - Number of random bytes to generate.
 * @returns {string} Hex-encoded string.
 */
function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Resolves admin auth environment variables for E2E runs.
 *
 * In CI, these should be provided explicitly via workflow env/secrets.
 * For local dev/test, we generate per-process values to avoid hardcoded secrets.
 *
 * Notes:
 * - Values generated here are stable only for the lifetime of the current process.
 * - We also populate `process.env` so Playwright tests can read the same values.
 *
 * @returns {{ adminPassword: string, adminSessionSecret: string, adminCsrfSecret: string }}
 * An object containing the resolved admin auth env values.
 */
function resolveAdminE2eAuthEnv(): {
  adminPassword: string;
  adminSessionSecret: string;
  adminCsrfSecret: string;
} {
  const rawPassword: string =
    typeof process.env.ADMIN_PASSWORD === "string" ? process.env.ADMIN_PASSWORD.trim() : "";
  const rawSessionSecret: string =
    typeof process.env.ADMIN_SESSION_SECRET === "string"
      ? process.env.ADMIN_SESSION_SECRET.trim()
      : "";
  const rawCsrfSecret: string =
    typeof process.env.ADMIN_CSRF_SECRET === "string" ? process.env.ADMIN_CSRF_SECRET.trim() : "";

  const adminPassword: string = rawPassword.length > 0 ? rawPassword : randomHex(16);
  const adminSessionSecret: string =
    rawSessionSecret.length >= 32 ? rawSessionSecret : randomHex(32);
  const adminCsrfSecret: string = rawCsrfSecret.length >= 32 ? rawCsrfSecret : randomHex(32);

  if (rawPassword.length === 0) {
    process.env.ADMIN_PASSWORD = adminPassword;
  }

  if (rawSessionSecret.length < 32) {
    process.env.ADMIN_SESSION_SECRET = adminSessionSecret;
  }

  if (rawCsrfSecret.length < 32) {
    process.env.ADMIN_CSRF_SECRET = adminCsrfSecret;
  }

  return { adminPassword, adminSessionSecret, adminCsrfSecret };
}

const { adminSessionSecret, adminCsrfSecret } = resolveAdminE2eAuthEnv();

/**
 * Converts NodeJS.ProcessEnv into a Record<string, string> compatible with
 * Playwright's webServer env typing, dropping undefined values.
 *
 * @param {NodeJS.ProcessEnv} source - The source environment variables.
 * @param {Record<string, string>} overrides - Deterministic overrides for E2E.
 * @returns {Record<string, string>} A merged environment record.
 */
function buildWebServerEnv(
  source: NodeJS.ProcessEnv,
  overrides: Record<string, string>,
): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = value;
  }

  return merged;
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,

  expect: {
    timeout: 5_000,
  },

  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 2 : 0,
  fullyParallel: true,
  reporter: process.env.CI === "true" ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: WEB_SERVER_COMMAND,
    url: BASE_URL,
    reuseExistingServer: process.env.CI !== "true" && IS_COVERAGE === false,
    timeout: 60_000,

    env: buildWebServerEnv(process.env, {
      PORT: String(PORT),

      ADMIN_ALLOWED_HOST,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD?.trim().length
        ? process.env.ADMIN_PASSWORD.trim()
        : TEST_ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: adminSessionSecret,
      ADMIN_CSRF_SECRET: adminCsrfSecret,
    }),
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
