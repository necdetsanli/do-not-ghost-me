import { test as base, expect } from "@playwright/test";
import { promises as fs } from "node:fs";

/**
 * Extended Playwright test with automatic JS/CSS coverage capture (Chromium only).
 *
 * Usage:
 *   import { test, expect } from "@/tests/e2e/fixtures";
 */
export const test = base;

test.beforeEach(async ({ page }) => {
  await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: true });
  await page.coverage.startCSSCoverage({ resetOnNavigation: false });
});

test.afterEach(async ({ page }, testInfo) => {
  const js = await page.coverage.stopJSCoverage();
  const css = await page.coverage.stopCSSCoverage();

  const outPath = testInfo.outputPath("v8-coverage.json");
  await fs.writeFile(outPath, JSON.stringify({ js, css }, null, 2), "utf8");
});

export { expect };
