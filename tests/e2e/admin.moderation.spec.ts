import type { APIResponse, Locator, Page } from "@playwright/test";
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
 * Generates a valid test-net IPv4 address to reduce rate-limit collisions across runs.
 *
 * @returns {string} A valid IPv4 address in TEST-NET-3 (203.0.113.0/24).
 */
function generateTestIpAddress(): string {
  const lastOctet = (Date.now() % 200) + 1;
  return `203.0.113.${lastOctet}`;
}

/**
 * Selects an option from the app Select (Radix UI select trigger with role=combobox).
 *
 * @param {Locator} trigger - The select trigger locator (role=combobox).
 * @param {string} optionLabel - The visible option label to choose.
 * @returns {Promise<void>} Promise that resolves when the option is selected.
 */
async function selectRadixOptionByLabel(trigger: Locator, optionLabel: string): Promise<void> {
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const page = trigger.page();
  const option = page.getByRole("option", { name: optionLabel, exact: true });

  await expect(option).toBeVisible();
  await option.click();
}

/**
 * Selects a country in the CountrySelect type-ahead combobox.
 *
 * @param {Page} page - Playwright page.
 * @param {Locator} form - The report form locator.
 * @param {string} query - The query to type (e.g., "Ger").
 * @param {string} countryLabel - The country label to click (e.g., "Germany").
 * @returns {Promise<void>} Promise that resolves when the country is selected.
 */
async function selectCountryByTypeahead(
  page: Page,
  form: Locator,
  query: string,
  countryLabel: string,
): Promise<void> {
  const countryInput = form.getByRole("combobox", { name: /^Country$/i });

  await expect(countryInput).toBeVisible();
  await countryInput.fill(query);

  const option = page.getByRole("option", { name: countryLabel, exact: true });
  await expect(option).toBeVisible();
  await option.click();
}

/**
 * Creates a report using the public form, ensuring the min fill-time guard is satisfied.
 *
 * @param {Page} page - Playwright page.
 * @param {string} companyName - Unique company name.
 * @param {string} positionDetail - Unique position detail marker.
 * @returns {Promise<void>} Promise that resolves when the report is submitted and feedback is visible.
 */
async function createPublicReport(
  page: Page,
  companyName: string,
  positionDetail: string,
): Promise<void> {
  await page.goto("/");

  const form = page.getByRole("form", { name: /ghosting report form/i });
  await expect(form).toBeVisible();

  const companyInput = form.getByRole("combobox", { name: /^Company name$/i });
  await expect(companyInput).toBeVisible();
  await companyInput.fill(companyName);

  /**
   * Report form enforces a minimum interaction window before submit.
   * We wait slightly above 4000ms for stability.
   */
  await page.waitForTimeout(4200);

  const stageTrigger = form.getByRole("combobox", { name: /^Stage$/i });
  const jobLevelTrigger = form.getByRole("combobox", { name: /^Job level$/i });
  const categoryTrigger = form.getByRole("combobox", { name: /^Position category$/i });

  await selectRadixOptionByLabel(stageTrigger, "Technical Interview");
  await selectRadixOptionByLabel(jobLevelTrigger, "Junior");
  await selectRadixOptionByLabel(categoryTrigger, "Engineering");

  const positionDetailInput = form.getByRole("textbox", { name: /^Position detail$/i });
  await positionDetailInput.fill(positionDetail);

  const daysInput = form.getByRole("spinbutton", { name: /^Days without reply \(optional\)$/i });
  await daysInput.fill("14");

  await selectCountryByTypeahead(page, form, "Ger", "Germany");

  const submitButton = form.getByRole("button", { name: /^Submit report$/i });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  const feedback = page.getByText(
    /has been recorded|already submitted a report|daily report limit/i,
  );
  await expect(feedback).toBeVisible();
}

/**
 * Logs in as admin using the provided password.
 *
 * @param {Page} page - Playwright page.
 * @param {string} adminPassword - Admin password to submit.
 * @returns {Promise<void>} Promise that resolves when the admin dashboard is visible.
 */
async function loginAsAdmin(page: Page, adminPassword: string): Promise<void> {
  await page.goto("/admin/login");

  const loginForm = page.getByRole("form", { name: /admin login form/i });
  await expect(loginForm).toBeVisible();

  await loginForm.getByLabel(/^Password$/i).fill(adminPassword);

  await Promise.all([
    page.waitForURL(/\/admin(\/)?$/),
    loginForm.getByRole("button", { name: /^Sign in$/i }).click(),
  ]);

  await expect(page.getByRole("heading", { name: /Admin\s+–\s+Reports/i })).toBeVisible();
}

/**
 * Opens the admin dashboard and returns the first row matching the position detail marker.
 *
 * @param {Page} page - Playwright page.
 * @param {string} positionDetail - Unique marker expected in the table.
 * @returns {Promise<Locator>} The matching row locator.
 */
async function getAdminRowByPositionDetail(page: Page, positionDetail: string): Promise<Locator> {
  await page.goto("/admin");

  const table = page.getByRole("table", { name: /admin reports moderation table/i });
  await expect(table).toBeVisible();

  const row = table.getByRole("row").filter({ hasText: positionDetail }).first();
  await expect(row).toBeVisible();

  return row;
}

/**
 * Returns the action path (e.g. "/api/admin/reports/<id>") from a row action form.
 *
 * @param {Locator} row - Admin table row.
 * @returns {Promise<string>} Action path string.
 * @throws {Error} When action path cannot be found.
 */
async function getRowReportActionPath(row: Locator): Promise<string> {
  const anyActionForm = row.locator('form[action^="/api/admin/reports/"]').first();
  const actionPath = await anyActionForm.getAttribute("action");

  if (typeof actionPath !== "string" || actionPath.trim().length === 0) {
    throw new Error("Expected an action form with a non-empty action path.");
  }

  return actionPath.trim();
}

/**
 * Clicks an admin moderation action button inside the given row and waits for return to /admin.
 *
 * @param {Page} page - Playwright page.
 * @param {Locator} row - The target row locator.
 * @param {string} actionName - Button name to click (e.g., "Flag", "Restore").
 * @returns {Promise<void>} Promise that resolves after navigation back to /admin completes.
 */
async function clickAdminActionAndWait(
  page: Page,
  row: Locator,
  actionName: string,
): Promise<void> {
  const button = row.getByRole("button", { name: actionName, exact: true });
  await expect(button).toBeVisible();

  await Promise.all([page.waitForURL(/\/admin(\/)?$/), button.click()]);
}

/**
 * Clicks an admin moderation action for a report identified by the position detail marker.
 *
 * @param {Page} page - Playwright page.
 * @param {string} positionDetail - Unique marker expected in the table.
 * @param {string} actionName - Button name to click (e.g., "Restore", "Soft delete").
 * @returns {Promise<void>} Promise that resolves after the action completes and /admin is loaded.
 */
async function clickAdminActionByPositionDetail(
  page: Page,
  positionDetail: string,
  actionName: string,
): Promise<void> {
  const row = await getAdminRowByPositionDetail(page, positionDetail);
  await clickAdminActionAndWait(page, row, actionName);
}

/**
 * Asserts whether a company appears in the /companies listing when searched by name.
 *
 * @param {Page} page - Playwright page.
 * @param {string} companyName - Company name to search.
 * @param {boolean} shouldExist - Expected visibility.
 * @returns {Promise<void>} Promise that resolves when the expectation is satisfied.
 */
async function expectCompanyInCompaniesSearch(
  page: Page,
  companyName: string,
  shouldExist: boolean,
): Promise<void> {
  await page.goto(`/companies?search=${encodeURIComponent(companyName)}`);

  const table = page.getByRole("table", { name: /companies with ghosting reports/i });

  if (shouldExist === true) {
    await expect(table).toBeVisible();
    const row = table.getByRole("row").filter({ hasText: companyName }).first();
    await expect(row).toBeVisible();
    return;
  }

  const tableCount = await table.count();
  if (tableCount === 0) {
    return;
  }

  const row = table.getByRole("row").filter({ hasText: companyName });
  await expect(row).toHaveCount(0);
}

/**
 * Extracts the CSRF token from a hidden input on the current admin page.
 *
 * @param {Page} page - Playwright page (should be on /admin with forms).
 * @returns {Promise<string>} The CSRF token value.
 */
async function getCsrfTokenFromPage(page: Page): Promise<string> {
  const csrfInput = page.locator('input[type="hidden"][name="csrf_token"]').first();
  await expect(csrfInput).toBeAttached();
  const token = await csrfInput.inputValue();
  return token;
}

/**
 * Sends an admin moderation POST via APIRequestContext with explicit Origin/Referer
 * so that isOriginAllowed() can be exercised deterministically.
 *
 * @param {Page} page - Playwright page.
 * @param {string} absoluteUrl - Absolute URL to POST to.
 * @param {string} origin - Expected origin (e.g. "http://127.0.0.1:3000").
 * @param {Record<string, string>} form - Form fields.
 * @param {string} [overrideOrigin] - Optional origin override to test origin mismatch.
 * @returns {Promise<APIResponse>} API response.
 */
async function postAdminForm(
  page: Page,
  absoluteUrl: string,
  origin: string,
  form: Record<string, string>,
  overrideOrigin?: string,
): Promise<APIResponse> {
  const effectiveOrigin = typeof overrideOrigin === "string" ? overrideOrigin : origin;

  return page.request.post(absoluteUrl, {
    form,
    headers: {
      origin: effectiveOrigin,
      referer: `${effectiveOrigin}/admin`,
    },
    maxRedirects: 0,
  });
}

test.describe("admin dashboard moderation", () => {
  test("admin can flag, restore, soft delete, and hard delete a report", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);

    const baseUrl = testInfo.project.use.baseURL;
    if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) {
      throw new Error("Expected project.use.baseURL to be configured.");
    }

    const origin = new URL(baseUrl).origin;

    const adminPassword = getAdminPassword();

    const testIp = generateTestIpAddress();
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": testIp,
    });

    const runId = String(Date.now());
    const companyName = `Admin E2E Corp ${runId}`;
    const positionDetail = `Junior Backend Developer (admin e2e) ${runId}`;

    {
      // Test unauthenticated request to admin moderation endpoint.
      // Note: We retry a few times to handle cold-start (Next.js JIT compilation) where
      // the first request might return 404 while the route is being compiled.
      const unauthUrl = new URL("/api/admin/reports/dummy-id", origin).toString();
      let res = await page.request.post(unauthUrl, {
        form: { action: "flag" },
        headers: {
          origin,
          referer: `${origin}/admin`,
        },
        maxRedirects: 0,
      });

      // Retry up to 2 more times if we get 404 (cold start)
      for (let retry = 0; retry < 2 && res.status() === 404; retry++) {
        await page.waitForTimeout(1000);
        res = await page.request.post(unauthUrl, {
          form: { action: "flag" },
          headers: {
            origin,
            referer: `${origin}/admin`,
          },
          maxRedirects: 0,
        });
      }

      expect(res.status()).toBe(401);
    }

    await createPublicReport(page, companyName, positionDetail);

    await expectCompanyInCompaniesSearch(page, companyName, true);

    await loginAsAdmin(page, adminPassword);

    // Extract CSRF token from the admin page forms
    const csrfToken = await getCsrfTokenFromPage(page);

    const row = await getAdminRowByPositionDetail(page, positionDetail);
    await expect(row.getByText(/^Active$/i)).toBeVisible();

    const actionPath = await getRowReportActionPath(row);
    const actionUrl = new URL(actionPath, origin).toString();

    {
      // Test origin mismatch - should fail at origin check (401)
      const res = await postAdminForm(
        page,
        actionUrl,
        origin,
        { action: "flag", csrf_token: csrfToken },
        "https://evil.example",
      );
      expect(res.status()).toBe(401);
    }

    {
      // Test invalid action with valid CSRF - should fail at action validation (400)
      const res = await postAdminForm(page, actionUrl, origin, {
        action: "nope",
        csrf_token: csrfToken,
      });
      expect(res.status()).toBe(400);
    }

    {
      // Test valid flag action - should succeed with redirect (303)
      const res = await postAdminForm(page, actionUrl, origin, {
        action: "flag",
        reason: "E2E: suspected spam",
        csrf_token: csrfToken,
      });
      expect(res.status()).toBe(303);
    }

    {
      const flaggedRow = await getAdminRowByPositionDetail(page, positionDetail);
      await expect(flaggedRow.getByText(/^Flagged$/i)).toBeVisible();
      await expect(flaggedRow.getByText(/Reason:\s*E2E: suspected spam/i)).toBeVisible();
    }

    await expectCompanyInCompaniesSearch(page, companyName, false);

    await clickAdminActionByPositionDetail(page, positionDetail, "Restore");

    {
      const restoredRow = await getAdminRowByPositionDetail(page, positionDetail);
      await expect(restoredRow.getByText(/^Active$/i)).toBeVisible();
    }

    await expectCompanyInCompaniesSearch(page, companyName, true);

    await clickAdminActionByPositionDetail(page, positionDetail, "Soft delete");

    {
      const deletedRow = await getAdminRowByPositionDetail(page, positionDetail);
      await expect(deletedRow.getByText(/^Deleted$/i)).toBeVisible();
    }

    await expectCompanyInCompaniesSearch(page, companyName, false);

    {
      const deletedRow = await getAdminRowByPositionDetail(page, positionDetail);

      const hardDeleteButton = deletedRow.getByRole("button", { name: /^Hard delete$/i });
      await expect(hardDeleteButton).toBeVisible();

      await Promise.all([page.waitForURL(/\/admin(\/)?$/), hardDeleteButton.click()]);
    }

    await page.goto("/admin");
    {
      const table = page.getByRole("table", { name: /admin reports moderation table/i });
      const remaining = table.getByRole("row").filter({ hasText: positionDetail });
      await expect(remaining).toHaveCount(0);
    }

    await expectCompanyInCompaniesSearch(page, companyName, false);
  });
});
