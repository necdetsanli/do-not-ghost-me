import type { Locator, Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD_WRONG } from "../testUtils/testSecrets";
import { expect, test } from "./fixtures";

/**
 * Returns an admin password for E2E tests.
 *
 * This MUST return the same password that was passed to the webServer
 * via the Playwright config. Since testSecrets.ts generates random values
 * per-process, we must always prefer process.env.ADMIN_PASSWORD which
 * is set by the config and inherited by test workers.
 *
 * @returns Admin password string.
 * @throws Error if ADMIN_PASSWORD is not set (indicates misconfiguration).
 */
function getAdminPassword(): string {
  const raw = process.env.ADMIN_PASSWORD;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }

  throw new Error(
    "ADMIN_PASSWORD not set in environment. " +
      "Ensure playwright.config.ts sets process.env.ADMIN_PASSWORD before tests run.",
  );
}

/**
 * Sets a deterministic client IP for the test to keep rate-limiting stable.
 *
 * @param {Page} page - Playwright page.
 * @returns {Promise<void>} Promise resolved when headers are applied.
 */
async function setDeterministicClientIp(page: Page): Promise<void> {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": "203.0.113.10",
  });
}

/**
 * Returns the admin login form locator.
 *
 * @param {Page} page - Playwright page.
 * @returns {Locator} Login form locator.
 */
function getAdminLoginForm(page: Page): Locator {
  return page.getByRole("form", { name: /admin login form/i });
}

test.describe("admin login error handling", () => {
  test("wrong password redirects back with error and shows alert", async ({ page }) => {
    await setDeterministicClientIp(page);

    await page.goto("/admin/login");

    const form = getAdminLoginForm(page);
    await expect(form).toBeVisible();

    await form.getByLabel(/^Password$/i).fill(TEST_ADMIN_PASSWORD_WRONG);

    await Promise.all([
      page.waitForURL(/\/admin\/login\?error=1/i),
      form.getByRole("button", { name: /^Sign in$/i }).click(),
    ]);

    const alert = page
      .getByRole("main")
      .locator('[role="alert"]')
      .filter({ hasText: /invalid password or session token/i });
    await expect(alert).toBeVisible();
  });

  test("correct password logs in and lands on /admin", async ({ page }) => {
    await setDeterministicClientIp(page);

    const adminPassword = getAdminPassword();

    await page.goto("/admin/login");

    const form = getAdminLoginForm(page);
    await expect(form).toBeVisible();

    await form.getByLabel(/^Password$/i).fill(adminPassword);

    await Promise.all([
      page.waitForURL(/\/admin(\/)?$/i),
      form.getByRole("button", { name: /^Sign in$/i }).click(),
    ]);

    await expect(page.getByRole("heading", { name: /^Admin\s+–\s+Reports$/i })).toBeVisible();
  });
});
