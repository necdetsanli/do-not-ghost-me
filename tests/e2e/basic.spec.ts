import { test, expect } from "@playwright/test";

/**
 * Basic happy-path flows for the public UI:
 * - Submitting a ghosting report.
 * - Viewing the aggregated "top companies" page.
 */
test.describe("do-not-ghost-me basic flows", () => {
  /**
   * Renders the home page, fills out the report form (including the country
   * type-ahead combobox) and submits it, accepting either a success message
   * or a duplicate/rate-limit message.
   */
  test("home page renders and report form is usable", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/ghost report/i)).toBeVisible();

    const companyInput = page.getByLabel(/company name/i);
    const stageSelect = page.getByLabel(/stage/i);
    const jobLevelSelect = page.getByLabel(/job level/i);
    const categorySelect = page.getByLabel(/position category/i);
    const positionDetailInput = page.getByLabel(
      /position detail \(e\.g\. backend developer\)/i,
    );
    const daysInput = page.getByLabel(/days without reply/i);

    // Country is now a custom type-ahead combobox:
    const countryInput = page.getByPlaceholder(/start typing a country/i);

    await companyInput.fill("Playwright Test Corp");
    await stageSelect.selectOption({ label: "Technical Interview" });
    await jobLevelSelect.selectOption({ label: "Junior" });
    await categorySelect.selectOption({ label: "Software Engineering" });
    await positionDetailInput.fill(
      "Junior Backend Developer (Playwright test)",
    );
    await daysInput.fill("30");

    // Type a prefix and pick a concrete country from the dropdown,
    // so that the hidden CountryCode field is populated (e.g. "DE").
    await countryInput.fill("Ger");
    await expect(page.getByRole("button", { name: "Germany" })).toBeVisible();
    await page.getByRole("button", { name: "Germany" }).click();

    await page.getByRole("button", { name: /submit report/i }).click();

    // Accept both:
    //  - success: "Thank you. Your report has been recorded."
    //  - duplicate/rate-limit: "You have already submitted a report ..."
    const feedback = page.getByText(
      /has been recorded|already submitted a report/i,
    );

    await expect(feedback).toBeVisible();
  });

  /**
   * Renders the "top companies" page and asserts that the filter controls
   * and the results table (or at least a table shell) are present.
   */
  test("top companies page renders and shows filters + table", async ({
    page,
  }) => {
    await page.goto("/top-companies");

    // Filter controls should be visible
    await expect(
      page.getByRole("textbox", { name: /search by company name/i }),
    ).toBeVisible();

    // Country is now a select (combobox), not a plain text input
    await expect(
      page.getByRole("combobox", { name: /country/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("combobox", { name: /position category/i }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: /stage/i })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /seniority/i }),
    ).toBeVisible();

    // Table with results/empty state should be rendered
    await expect(page.getByRole("table")).toBeVisible();
  });
});
