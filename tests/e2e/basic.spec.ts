// tests/e2e/basic.spec.ts

import { test, expect } from "@playwright/test";

/**
 * Basic happy-path flows for the public UI:
 * - Submitting a ghosting report.
 * - Viewing the aggregated "top companies" page.
 */
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

    const countryInput = page.getByPlaceholder(/start typing a country/i);

    await companyInput.fill("Playwright Test Corp");
    await stageSelect.selectOption({ label: "Technical Interview" });
    await jobLevelSelect.selectOption({ label: "Junior" });
    await categorySelect.selectOption({ label: "Software Engineering" });
    await positionDetailInput.fill(
      "Junior Backend Developer (Playwright test)",
    );
    await daysInput.fill("30");

    await countryInput.fill("Ger");
    await expect(page.getByRole("button", { name: "Germany" })).toBeVisible();
    await page.getByRole("button", { name: "Germany" }).click();

    await page.getByRole("button", { name: /submit report/i }).click();

    // Kabul ettiğimiz kullanıcı mesajları:
    //  - başarı: "Thank you. Your report has been recorded."
    //  - duplicate: "You have already submitted a report ..."
    //  - günlük limit: "You have reached the daily report limit for this IP address."
    const feedback = page.getByText(
      /has been recorded|already submitted a report|daily report limit/i,
    );

    await expect(feedback).toBeVisible();
  });

  test("top companies page renders and shows filters + table", async ({
    page,
  }) => {
    await page.goto("/top-companies");

    await expect(
      page.getByRole("textbox", { name: /search by company name/i }),
    ).toBeVisible();

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

    await expect(page.getByRole("table")).toBeVisible();
  });
});
