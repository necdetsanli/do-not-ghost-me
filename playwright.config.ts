import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const DEFAULT_BASE_URL = `http://localhost:${PORT}`;

const BASE_URL: string = process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
const ADMIN_ALLOWED_HOST: string = new URL(BASE_URL).host;

const DEFAULT_ADMIN_PASSWORD = "test-admin-password";
const DEFAULT_ADMIN_SESSION_SECRET = "test-admin-session-secret-0123456789abcdef0123456789abcdef";
const DEFAULT_ADMIN_CSRF_SECRET = "test-admin-csrf-secret-0123456789abcdef0123456789abcdef";

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

/**
 * Playwright end-to-end test configuration.
 *
 * Responsibilities:
 * - Run E2E specs from tests/e2e.
 * - Start a Next.js dev server for local/dev runs.
 * - Use a Chromium desktop profile by default.
 */
export default defineConfig({
  /**
   * Root directory for end-to-end tests.
   */
  testDir: "./tests/e2e",

  /**
   * Global timeout per test (including hooks) in milliseconds.
   */
  timeout: 60_000,

  expect: {
    /**
     * Timeout for Playwright's `expect` assertions.
     */
    timeout: 5_000,
  },

  /**
   * Avoid accidentally committing `test.only` in CI.
   */
  forbidOnly: process.env.CI === "true",

  /**
   * Retry policy:
   * - CI: retry flaky tests a couple of times.
   * - Local: fail fast (no retries).
   */
  retries: process.env.CI === "true" ? 2 : 0,

  /**
   * Parallelism settings.
   */
  fullyParallel: true,

  /**
   * Reporter selection:
   * - CI: GitHub-friendly output.
   * - Local: human-friendly list output.
   */
  reporter: process.env.CI === "true" ? "github" : "list",

  use: {
    /**
     * Base URL for `page.goto` calls.
     */
    baseURL: BASE_URL,

    /**
     * Run in headless mode by default for determinism and performance.
     */
    headless: true,

    /**
     * Capture traces on the first retry only.
     */
    trace: "on-first-retry",

    /**
     * Capture screenshots only when a test fails.
     */
    screenshot: "only-on-failure",

    /**
     * Record video only for failing tests to help debugging.
     */
    video: "retain-on-failure",
  },

  webServer: {
    /**
     * Starts the Next.js dev server before E2E tests.
     */
    command: "npm run dev",

    /**
     * Ensures Playwright waits for the exact URL (and host) used by tests.
     */
    url: BASE_URL,

    /**
     * Reuse an existing server in local runs for faster feedback.
     */
    reuseExistingServer: process.env.CI !== "true",

    /**
     * Server startup timeout in milliseconds.
     */
    timeout: 60_000,

    /**
     * Injects deterministic env values for E2E so host/origin checks work reliably.
     */
    env: buildWebServerEnv(process.env, {
      ADMIN_ALLOWED_HOST,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET ?? DEFAULT_ADMIN_SESSION_SECRET,
      ADMIN_CSRF_SECRET: process.env.ADMIN_CSRF_SECRET ?? DEFAULT_ADMIN_CSRF_SECRET,
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
