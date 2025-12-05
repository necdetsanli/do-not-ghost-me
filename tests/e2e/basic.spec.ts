// tests/e2e/basic.spec.ts
import { test, expect } from "@playwright/test";

test.describe("do-not-ghost-me basic flows", () => {
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
    const countryInput = page.getByLabel(/country \(optional\)/i);

    await companyInput.fill("Playwright Test Corp");
    await stageSelect.selectOption({ label: "Technical Interview" });
    await jobLevelSelect.selectOption({ label: "Junior" });
    await categorySelect.selectOption({ label: "Software Engineering" });
    await positionDetailInput.fill(
      "Junior Backend Developer (Playwright test)",
    );
    await daysInput.fill("30");
    await countryInput.fill("Testland");

    await page.getByRole("button", { name: /submit report/i }).click();

    // Accept BOTH:
    //  - success: "Thank you. Your report has been recorded."
    //  - duplicate/rate-limit: "You have already submitted a report ..."
    const feedback = page.getByText(
      /has been recorded|already submitted a report/i,
    );

    await expect(feedback).toBeVisible();
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
