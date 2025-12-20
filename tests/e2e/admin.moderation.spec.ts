// tests/e2e/admin.moderation.spec.ts
import type { Page, Locator, APIResponse } from "@playwright/test";
import { test, expect } from "./fixtures";

/**
 * Generates a valid test-net IPv4 address to reduce rate-limit collisions across runs.
 *
 * @returns A valid IPv4 address in TEST-NET-3 (203.0.113.0/24).
 */
function generateTestIpAddress(): string {
  const lastOctet = (Date.now() % 200) + 1;
  return `203.0.113.${lastOctet}`;
}

/**
 * Selects an option from the app Select (Radix UI select trigger with role=combobox).
 *
 * @param trigger - The select trigger locator (role=combobox).
 * @param optionLabel - The visible option label to choose.
 * @returns Promise that resolves when the option is selected.
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
 * @param page - Playwright page.
 * @param form - The report form locator.
 * @param query - The query to type (e.g., "Ger").
 * @param countryLabel - The country label to click (e.g., "Germany").
 * @returns Promise that resolves when the country is selected.
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
 * @param page - Playwright page.
 * @param companyName - Unique company name.
 * @param positionDetail - Unique position detail marker.
 * @returns Promise that resolves when the report is submitted and feedback is visible.
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
  const categoryTrigger = form.getByRole("combobox", {
    name: /^Position category$/i,
  });

  await selectRadixOptionByLabel(stageTrigger, "Technical Interview");
  await selectRadixOptionByLabel(jobLevelTrigger, "Junior");
  await selectRadixOptionByLabel(categoryTrigger, "Engineering");

  const positionDetailInput = form.getByRole("textbox", {
    name: /^Position detail$/i,
  });
  await positionDetailInput.fill(positionDetail);

  const daysInput = form.getByRole("spinbutton", {
    name: /^Days without reply \(optional\)$/i,
  });
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
 * @param page - Playwright page.
 * @param adminPassword - Admin password to submit.
 * @returns Promise that resolves when the admin dashboard is visible.
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
 * @param page - Playwright page.
 * @param positionDetail - Unique marker expected in the table.
 * @returns The matching row locator.
 */
async function getAdminRowByPositionDetail(page: Page, positionDetail: string): Promise<Locator> {
  await page.goto("/admin");

  const table = page.getByRole("table", {
    name: /admin reports moderation table/i,
  });
  await expect(table).toBeVisible();

  const row = table.getByRole("row").filter({ hasText: positionDetail }).first();
  await expect(row).toBeVisible();

  return row;
}

/**
 * Returns the action path (e.g. "/api/admin/reports/<id>") from a row action form.
 *
 * @param row - Admin table row.
 * @returns Action path string.
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
 * @param page - Playwright page.
 * @param row - The target row locator.
 * @param actionName - Button name to click (e.g., "Flag", "Restore").
 * @returns Promise that resolves after navigation back to /admin completes.
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
 * This helper is navigation-safe: it re-opens /admin and re-resolves the row
 * before attempting to click, avoiding stale locators after page.goto().
 *
 * @param page - Playwright page.
 * @param positionDetail - Unique marker expected in the table.
 * @param actionName - Button name to click (e.g., "Restore", "Soft delete").
 * @returns Promise that resolves after the action completes and /admin is loaded.
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
 * @param page - Playwright page.
 * @param companyName - Company name to search.
 * @param shouldExist - Expected visibility.
 * @returns Promise that resolves when the expectation is satisfied.
 */
async function expectCompanyInCompaniesSearch(
  page: Page,
  companyName: string,
  shouldExist: boolean,
): Promise<void> {
  await page.goto(`/companies?search=${encodeURIComponent(companyName)}`);

  const table = page.getByRole("table", {
    name: /companies with ghosting reports/i,
  });

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
 * Sends an admin moderation POST via APIRequestContext with explicit Origin/Referer
 * so that isOriginAllowed() can be exercised deterministically.
 *
 * @param page - Playwright page.
 * @param absoluteUrl - Absolute URL to POST to.
 * @param origin - Expected origin (e.g. "http://127.0.0.1:3000").
 * @param form - Form fields.
 * @param overrideOrigin - Optional origin override to test origin mismatch.
 * @returns API response.
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

    /**
     * If env isn't provided, we use the same fallback as playwright.config.ts injects into webServer.
     */
    const adminPassword = process.env.ADMIN_PASSWORD ?? "test-admin-password";

    const testIp = generateTestIpAddress();
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": testIp,
    });

    const runId = String(Date.now());
    const companyName = `Admin E2E Corp ${runId}`;
    const positionDetail = `Junior Backend Developer (admin e2e) ${runId}`;

    /**
     * 0) Cover: unauthorized admin moderation attempt (requireAdminRequest path).
     * We set Origin/Referer to pass origin checks, then assert we are rejected due to missing session.
     */
    {
      const unauthUrl = new URL("/api/admin/reports/dummy-id", origin).toString();
      const res = await page.request.post(unauthUrl, {
        form: { action: "flag" },
        headers: {
          origin,
          referer: `${origin}/admin`,
        },
        maxRedirects: 0,
      });
      expect(res.status()).toBe(401);
    }

    /**
     * 1) Create report via public form (covers rateLimit + form validation paths).
     */
    await createPublicReport(page, companyName, positionDetail);

    /**
     * Public stats should include ACTIVE report.
     */
    await expectCompanyInCompaniesSearch(page, companyName, true);

    /**
     * 2) Admin login.
     */
    await loginAsAdmin(page, adminPassword);

    /**
     * 3) Locate row.
     */
    const row = await getAdminRowByPositionDetail(page, positionDetail);
    await expect(row.getByText(/^Active$/i)).toBeVisible();

    /**
     * Extract report action path for API coverage.
     */
    const actionPath = await getRowReportActionPath(row);
    const actionUrl = new URL(actionPath, origin).toString();

    /**
     * 4) Cover: origin mismatch (isOriginAllowed -> false).
     */
    {
      const res = await postAdminForm(
        page,
        actionUrl,
        origin,
        { action: "flag" },
        "https://evil.example",
      );
      expect(res.status()).toBe(401);
    }

    /**
     * 5) Cover: unknown moderation action -> 400.
     */
    {
      const res = await postAdminForm(page, actionUrl, origin, {
        action: "nope",
      });
      expect(res.status()).toBe(400);
    }

    /**
     * 6) Flag via API with a reason (covers normalizeOptionalText + flaggedReason render).
     */
    {
      const res = await postAdminForm(page, actionUrl, origin, {
        action: "flag",
        reason: "E2E: suspected spam",
      });
      expect(res.status()).toBe(303);
    }

    /**
     * Admin UI should show FLAGGED + reason.
     */
    {
      const flaggedRow = await getAdminRowByPositionDetail(page, positionDetail);
      await expect(flaggedRow.getByText(/^Flagged$/i)).toBeVisible();
      await expect(flaggedRow.getByText(/Reason:\s*E2E: suspected spam/i)).toBeVisible();
    }

    /**
     * Public stats should exclude FLAGGED (navigates to /companies).
     */
    await expectCompanyInCompaniesSearch(page, companyName, false);

    /**
     * 7) Restore via UI (navigation-safe).
     */
    await clickAdminActionByPositionDetail(page, positionDetail, "Restore");

    /**
     * Admin UI should show ACTIVE again.
     */
    {
      const restoredRow = await getAdminRowByPositionDetail(page, positionDetail);
      await expect(restoredRow.getByText(/^Active$/i)).toBeVisible();
    }

    /**
     * Public stats should include ACTIVE (navigates to /companies).
     */
    await expectCompanyInCompaniesSearch(page, companyName, true);

    /**
     * 8) Soft delete via UI (navigation-safe).
     */
    await clickAdminActionByPositionDetail(page, positionDetail, "Soft delete");

    /**
     * Admin UI should show DELETED.
     */
    {
      const deletedRow = await getAdminRowByPositionDetail(page, positionDetail);
      await expect(deletedRow.getByText(/^Deleted$/i)).toBeVisible();
    }

    /**
     * Public stats should exclude DELETED (navigates to /companies).
     */
    await expectCompanyInCompaniesSearch(page, companyName, false);

    /**
     * 9) Hard delete via UI (navigation-safe).
     */
    {
      const deletedRow = await getAdminRowByPositionDetail(page, positionDetail);

      const hardDeleteButton = deletedRow.getByRole("button", {
        name: /^Hard delete$/i,
      });
      await expect(hardDeleteButton).toBeVisible();

      await Promise.all([page.waitForURL(/\/admin(\/)?$/), hardDeleteButton.click()]);
    }

    /**
     * Row should be gone from the admin table.
     */
    await page.goto("/admin");
    {
      const table = page.getByRole("table", {
        name: /admin reports moderation table/i,
      });
      const remaining = table.getByRole("row").filter({ hasText: positionDetail });
      await expect(remaining).toHaveCount(0);
    }

    /**
     * Public stats should not show it.
     */
    await expectCompanyInCompaniesSearch(page, companyName, false);
  });
});
