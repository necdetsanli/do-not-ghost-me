// tests/e2e/basic.spec.ts
import type { APIRequestContext, Locator } from "@playwright/test";
import { test, expect } from "./fixtures";
import { CountryCode, JobLevel, PositionCategory, Stage } from "@prisma/client";

type SeedReportArgs = {
  companyName: string;
  country: CountryCode;
  ip: string;
};

/**
 * Creates a single ghosting report via the public API.
 *
 * @param request - Playwright API request context.
 * @param args - Seed parameters (use a unique companyName and IP per run).
 */
async function seedReport(request: APIRequestContext, args: SeedReportArgs): Promise<void> {
  const res = await request.post("/api/reports", {
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": args.ip,
    },
    data: {
      companyName: args.companyName,
      stage: Stage.TECHNICAL,
      jobLevel: JobLevel.JUNIOR,
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "Playwright seeded report",
      daysWithoutReply: 30,
      country: args.country,
      honeypot: "",
    },
  });

  expect(res.ok()).toBe(true);
}

/**
 * Returns the Radix/shadcn Select trigger buttons inside the report form.
 *
 * The app SelectTrigger has a stable `data-slot="select-trigger"` attribute,
 * so we prefer it over accessible names which can be inconsistent.
 *
 * @param form - Form locator scope.
 * @returns Trigger locators in the exact render order: stage, job level, category.
 */
function getReportFormSelectTriggers(form: Locator): {
  stage: Locator;
  jobLevel: Locator;
  category: Locator;
} {
  const triggers = form.locator('button[role="combobox"][data-slot="select-trigger"]');
  return {
    stage: triggers.nth(0),
    jobLevel: triggers.nth(1),
    category: triggers.nth(2),
  };
}

/**
 * Selects an option by visible label from the app's Radix/shadcn Select component.
 *
 * This scopes the option lookup to the open Radix content via `data-slot="select-content"`
 * to avoid collisions with other listboxes (e.g. CountrySelect).
 *
 * @param trigger - The select trigger locator.
 * @param optionName - The option label to click.
 */
async function selectAppSelectOptionByName(
  trigger: Locator,
  optionName: RegExp | string,
): Promise<void> {
  const page = trigger.page();

  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const content = page.locator('[data-slot="select-content"]').last();
  await expect(content).toBeVisible();

  const option =
    typeof optionName === "string"
      ? content.getByRole("option", { name: optionName })
      : content.getByRole("option", { name: optionName });

  await expect(option).toBeVisible();
  await option.click();

  await expect(content).toBeHidden();
}

/**
 * Basic happy-path flows for the public UI:
 * - Submitting a ghosting report.
 * - Viewing the aggregated "Companies" page.
 */
test.describe("do-not-ghost-me basic flows", () => {
  test("home page renders and report form is usable", async ({ page }) => {
    await page.goto("/");

    const form = page.getByRole("form", { name: /ghosting report form/i });
    await expect(form).toBeVisible();

    const companyInput = form.getByRole("combobox", { name: /company name/i });
    await companyInput.fill("Playwright Test Corp");

    /**
     * Close any open popovers (e.g. autocomplete suggestions) before interacting
     * with other popover-based controls to avoid click interception.
     */
    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 1, y: 1 } });

    const triggers = getReportFormSelectTriggers(form);
    await expect(form.locator('button[role="combobox"][data-slot="select-trigger"]')).toHaveCount(
      3,
    );

    await selectAppSelectOptionByName(triggers.stage, /technical interview/i);
    await selectAppSelectOptionByName(triggers.jobLevel, /^junior$/i);
    await selectAppSelectOptionByName(triggers.category, /^engineering$/i);

    const positionDetailInput = form.getByRole("textbox", {
      name: /position detail/i,
    });
    await positionDetailInput.fill("Junior Backend Developer (Playwright test)");

    const daysInput = form.getByRole("spinbutton", {
      name: /days without reply/i,
    });
    await daysInput.fill("30");

    /**
     * The form enforces a minimum interaction time before it will submit to the API.
     * Submitting too quickly is treated as bot-like and skips the API call.
     */
    await page.waitForTimeout(4100);

    const countryCombobox = form.getByRole("combobox", { name: /^country$/i });
    await countryCombobox.fill("Ger");

    const germanyOption = page.getByRole("option", { name: "Germany" });
    await expect(germanyOption).toBeVisible();
    await germanyOption.click();

    await form.getByRole("button", { name: /submit report/i }).click();

    const feedback = page.getByText(
      /has been recorded|already submitted a report|daily report limit/i,
    );
    await expect(feedback).toBeVisible();
  });

  test("companies page renders and shows filters + table", async ({ page }) => {
    const uniqueCompanyName = `Playwright Seeded Corp ${Date.now()}`;
    const uniqueIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

    await seedReport(page.request, {
      companyName: uniqueCompanyName,
      country: CountryCode.DE,
      ip: uniqueIp,
    });

    await page.goto("/companies");

    const filterForm = page.getByRole("form", {
      name: /filter ghosting companies/i,
    });
    await expect(filterForm).toBeVisible();

    const searchInput = filterForm.getByRole("textbox", {
      name: /search by company name/i,
    });
    await expect(searchInput).toBeVisible();

    await expect(filterForm.getByRole("combobox", { name: /country/i })).toBeVisible();

    await searchInput.fill(uniqueCompanyName);
    await filterForm.getByRole("button", { name: /apply filters/i }).click();

    const table = page.getByRole("table", {
      name: /companies with ghosting reports/i,
    });
    await expect(table).toBeVisible();

    await expect(page.getByRole("cell", { name: uniqueCompanyName })).toBeVisible();
  });
});
