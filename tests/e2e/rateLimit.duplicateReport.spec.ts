// tests/e2e/rateLimit.duplicateReport.spec.ts
import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Generates a valid test-net IPv4 address.
 *
 * @returns A TEST-NET-3 IPv4 address (203.0.113.0/24).
 */
function generateTestIpAddress(): string {
  const lastOctet = (Date.now() % 200) + 1;
  return `203.0.113.${lastOctet}`;
}

/**
 * Selects an option from a Radix UI select trigger that renders a combobox.
 *
 * @param trigger - Combobox trigger locator.
 * @param optionLabel - Visible label of the option.
 * @returns Promise resolved after the option is selected.
 */
async function selectRadixOptionByLabel(
  trigger: Locator,
  optionLabel: string,
): Promise<void> {
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
 * @param form - Report form locator.
 * @param query - Query to type (e.g. "Ger").
 * @param countryLabel - Country option to click (e.g. "Germany").
 * @returns Promise resolved after selection.
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
 * Submits the public report form with deterministic timing constraints.
 *
 * @param page - Playwright page.
 * @param companyName - Company name to fill.
 * @param positionDetail - Position detail text.
 * @returns Promise resolved when a feedback message is visible.
 */
async function submitReport(
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
  await expect(positionDetailInput).toBeVisible();
  await positionDetailInput.fill(positionDetail);

  const daysInput = form.getByRole("spinbutton", {
    name: /^Days without reply \(optional\)$/i,
  });
  await expect(daysInput).toBeVisible();
  await daysInput.fill("30");

  await selectCountryByTypeahead(page, form, "Ger", "Germany");

  const submitButton = form.getByRole("button", { name: /^Submit report$/i });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  const feedback = page.getByText(
    /has been recorded|already submitted a report|daily report limit/i,
  );
  await expect(feedback).toBeVisible();
}

test.describe("rate limiting: duplicate reports", () => {
  test("submitting the same report twice shows a duplicate message", async ({
    page,
  }) => {
    const ip = generateTestIpAddress();
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });

    const runId = String(Date.now());
    const companyName = `Duplicate Limit Corp ${runId}`;
    const positionDetail = `Backend Developer (duplicate test) ${runId}`;

    await submitReport(page, companyName, positionDetail);

    await submitReport(page, companyName, positionDetail);

    const secondFeedback = page.getByText(
      /already submitted a report|daily report limit/i,
    );
    await expect(secondFeedback).toBeVisible();
  });
});
