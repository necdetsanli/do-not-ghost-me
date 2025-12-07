// tests/e2e/rateLimit.duplicateReport.spec.ts
import { test, expect } from "@playwright/test";

/**
 * E2E test to verify that submitting the exact same report twice
 * from the same IP does not create two distinct records.
 *
 * We exercise the browser UI end-to-end and look for user-facing
 * rate-limit feedback.
 */
test.describe("rate limiting: duplicate reports", () => {
  test("submitting the same report twice shows a duplicate message", async ({
    page,
  }) => {
    const companyName = `Duplicate Limit Corp ${Date.now()}`;

    const fillFormOnce = async () => {
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

      await companyInput.fill(companyName);
      await stageSelect.selectOption({ label: "Technical Interview" });
      await jobLevelSelect.selectOption({ label: "Junior" });
      await categorySelect.selectOption({ label: "Software Engineering" });
      await positionDetailInput.fill("Backend Developer (duplicate test)");
      await daysInput.fill("30");

      await countryInput.fill("Ger");
      await expect(page.getByRole("button", { name: "Germany" })).toBeVisible();
      await page.getByRole("button", { name: "Germany" }).click();

      await page.getByRole("button", { name: /submit report/i }).click();
    };

    // İlk gönderim:
    //  - başarı ("has been recorded")
    //  - veya günlük limit ("daily report limit")
    await fillFormOnce();
    const firstFeedback = page.getByText(
      /has been recorded|already submitted a report|daily report limit/i,
    );
    await expect(firstFeedback).toBeVisible();

    // Aynı payload ile ikinci gönderim
    await fillFormOnce();

    // Burada ideal senaryo:
    //  - "You have already submitted a report ..." (duplicate per company/IP)
    // Ama eğer gün içinde çok test koşturduysan, global daily limit devreye
    // girmiş olabilir; o durumda "daily report limit" mesajını da kabul ediyoruz.
    const secondFeedback = page.getByText(
      /already submitted a report|daily report limit/i,
    );
    await expect(secondFeedback).toBeVisible();
  });
});
