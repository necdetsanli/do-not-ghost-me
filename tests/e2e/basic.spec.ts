// tests/e2e/basic.spec.ts
import { test, expect } from "@playwright/test";

test.describe("do-not-ghost-me basic flows", () => {
  test("home page renders and report form is usable", async ({ page }) => {
    await page.goto("/");

    // Check that core form controls are present
    await expect(page.getByLabel(/company name/i)).toBeVisible();
    await expect(page.getByLabel(/stage/i)).toBeVisible();
    await expect(page.getByLabel(/job level/i)).toBeVisible();
    await expect(page.getByLabel(/position category/i)).toBeVisible();
    await expect(page.getByLabel(/position detail/i)).toBeVisible();
    await expect(page.getByLabel(/days without reply/i)).toBeVisible();
    await expect(page.getByLabel(/country/i)).toBeVisible();

    // Fill in a valid report
    await page.getByLabel(/company name/i).fill("Playwright Test Corp");
    await page.getByLabel(/stage/i).selectOption("TECHNICAL");
    await page.getByLabel(/job level/i).selectOption("JUNIOR");
    await page
      .getByLabel(/position category/i)
      .selectOption("SOFTWARE_ENGINEERING");
    await page
      .getByLabel(/position detail/i)
      .fill("Junior Backend Developer (Playwright test)");
    await page.getByLabel(/days without reply/i).fill("30");
    await page.getByLabel(/country/i).fill("Testland");

    await page.getByRole("button", { name: /submit report/i }).click();

    // Expect success message
    await expect(
      page.getByText(/thank you\. your report has been recorded\./i),
    ).toBeVisible();
  });

  test("top companies page renders and shows filters + table", async ({
    page,
  }) => {
    await page.goto("/top-companies");

    // Filter controls should be visible
    await expect(page.getByRole("textbox", { name: /search/i })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /category/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /seniority/i }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: /stage/i })).toBeVisible();

    // Table with results/empty state should be rendered
    await expect(page.getByRole("table")).toBeVisible();
  });
});
