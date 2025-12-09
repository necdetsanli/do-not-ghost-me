// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const DEFAULT_BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Playwright end-to-end test configuration.
 *
 * Responsibilities:
 * - Run E2E specs from tests/e2e.
 * - Start a Next.js dev server on PORT for local/dev runs.
 * - Use a Chromium desktop profile by default.
 *
 * Notes:
 * - For CI you may prefer running against a production build
 *   (e.g. `npm run build && npm run start`), wired via your pipeline
 *   or a dedicated npm script.
 */
export default defineConfig({
  /**
   * Root directory for end-to-end tests.
   */
  testDir: "./tests/e2e",

  /**
   * Global timeout per test (including hooks) in milliseconds.
   */
  timeout: 30_000,

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
   * Parallelism:
   * - CI: keep the default parallelism.
   * - Local: also parallel by default; adjust if needed.
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
     * Base URL for `page.goto` calls. Can be overridden in CI
     * via PLAYWRIGHT_BASE_URL if you run the app on a different host.
     */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL,

    /**
     * Run in headless mode by default for determinism and performance.
     */
    headless: true,

    /**
     * Capture traces:
     * - On the first retry only, to keep artifacts manageable.
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

  /**
   * Web server configuration:
   * - Spins up the Next.js dev server before tests.
   * - Reuses an existing server in local runs for faster feedback.
   *
   * For production-like E2E in CI, consider:
   *   command: "npm run start:e2e",
   * where `start:e2e` performs a build and starts a prod server.
   */
  webServer: {
    command: "npm run dev",
    port: PORT,
    reuseExistingServer: process.env.CI !== "true",
    timeout: 60_000,
  },

  /**
   * Browser projects. Add Firefox/WebKit here if you want
   * multi-browser coverage.
   */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
