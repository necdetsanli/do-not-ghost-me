// tests/e2e/admin.login.error.spec.ts
import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Returns an admin password for E2E tests.
 *
 * If the environment variable is not present, we use a deterministic fallback
 * to match Playwright webServer env injection.
 *
 * @returns Admin password string.
 */
function getAdminPassword(): string {
  const raw = process.env.ADMIN_PASSWORD;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }

  return "test-admin-password";
}

/**
 * Sets a deterministic client IP for the test to keep rate-limiting stable.
 *
 * @param page - Playwright page.
 * @returns Promise resolved when headers are applied.
 */
async function setDeterministicClientIp(page: Page): Promise<void> {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": "203.0.113.10",
  });
}

/**
 * Returns the admin login form locator.
 *
 * @param page - Playwright page.
 * @returns Login form locator.
 */
function getAdminLoginForm(page: Page): Locator {
  return page.getByRole("form", { name: /admin login form/i });
}

test.describe("admin login error handling", () => {
  test("wrong password redirects back with error and shows alert", async ({
    page,
  }) => {
    await setDeterministicClientIp(page);

    await page.goto("/admin/login");

    const form = getAdminLoginForm(page);
    await expect(form).toBeVisible();

    await form.getByLabel(/^Password$/i).fill("definitely-wrong-password");

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

    await expect(
      page.getByRole("heading", { name: /^Admin\s+–\s+Reports$/i }),
    ).toBeVisible();
  });
});
