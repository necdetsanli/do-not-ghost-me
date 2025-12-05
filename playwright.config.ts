// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const DEFAULT_BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Playwright end-to-end test configuration.
 *
 * - Runs tests from tests/e2e
 * - Starts the Next.js dev server on PORT
 * - Uses a Chromium desktop profile
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  // Prevent accidentally committed `test.only` from passing CI.
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL,
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
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
