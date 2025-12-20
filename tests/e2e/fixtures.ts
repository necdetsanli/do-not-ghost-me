import { test as base, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

type Fixtures = {
  /**
   * Collects V8 JS coverage from Chromium and persists after each test.
   */
  collectV8Coverage: void;
};

function isCoverageEnabled(): boolean {
  return process.env.PW_COLLECT_V8_COVERAGE === "1";
}

function resolveCoverageOutDir(): string {
  const fromEnv = process.env.PW_COVERAGE_DIR;

  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  return "coverage/e2e/raw";
}

function sanitizeFileName(input: string): string {
  return input
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const test = base.extend<Fixtures>({
  collectV8Coverage: [
    async ({ page, browserName }, use, testInfo) => {
      const shouldCollect = isCoverageEnabled() === true && browserName === "chromium";

      if (shouldCollect === true) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }

      await use();

      if (shouldCollect === false) {
        return;
      }

      const v8 = await page.coverage.stopJSCoverage();

      const outDir = resolveCoverageOutDir();
      await fs.mkdir(outDir, { recursive: true });

      const title = sanitizeFileName(testInfo.titlePath.join(" "));
      const outPath = path.join(outDir, `${title}-${crypto.randomUUID()}.json`);

      await fs.writeFile(outPath, JSON.stringify(v8), "utf8");
    },
    { auto: true },
  ],
});

export { test, expect };
