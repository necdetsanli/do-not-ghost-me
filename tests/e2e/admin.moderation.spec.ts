// tests/e2e/admin.moderation.spec.ts
import { test, expect } from "@playwright/test";

/**
 * End-to-end test for the admin moderation flow:
 *
 * 1. Create a report as an anonymous user via the public form.
 * 2. Log in as admin using the configured ADMIN_PASSWORD.
 * 3. Navigate to the admin dashboard and ensure it is accessible.
 * 4. Locate a report in the admin table (identified by a known position detail).
 * 5. Flag the report and verify status is "Flagged".
 * 6. Restore the report and verify status is "Active" again.
 */
test.describe("admin dashboard moderation", () => {
  test("admin can flag and restore a report", async ({ page }) => {
    // Yine de unique company ismi üretelim; yeni kayıt oluşursa güzel.
    const companyName = `Admin E2E Corp ${Date.now()}`;
    const positionDetail = "Junior Backend Developer (admin e2e)";

    // -----------------------------------------------------------------------
    // 1) Create a report via the public home page
    // -----------------------------------------------------------------------
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
    await positionDetailInput.fill(positionDetail);
    await daysInput.fill("14");

    // Select a concrete country via the type-ahead combobox.
    await countryInput.fill("Ger");
    await expect(page.getByRole("button", { name: "Germany" })).toBeVisible();
    await page.getByRole("button", { name: "Germany" }).click();

    await page.getByRole("button", { name: /submit report/i }).click();

    // Accept:
    //  - success: "Thank you. Your report has been recorded."
    //  - duplicate/rate-limit: "You have already submitted a report ..."
    //  - daily limit: "You have reached the daily report limit ..."
    const feedback = page.getByText(
      /has been recorded|already submitted a report|daily report limit/i,
    );
    await expect(feedback).toBeVisible();

    // -----------------------------------------------------------------------
    // 2) Log in as admin
    // -----------------------------------------------------------------------
    await page.goto("/admin/login");

    const adminPassword = process.env.ADMIN_PASSWORD ?? "test-admin-password";

    await page.getByLabel(/password/i).fill(adminPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Login sonrası "/"'a gitse bile, asıl gereksinim: /admin'e erişim
    await page.goto("/admin");

    // -----------------------------------------------------------------------
    // 3) Assert that the admin dashboard is accessible
    // -----------------------------------------------------------------------
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(/admin – reports/i)).toBeVisible();

    // -----------------------------------------------------------------------
    // 4) Locate a row for our known position detail
    //
    // Company name timestamp bazlı ve rate limit sebebiyle her koşumda
    // yeni row oluşmayabilir. "Junior Backend Developer (admin e2e)"
    // ise DOM’da aynen görünen stabil bir metin.
    // -----------------------------------------------------------------------
    const row = page
      .getByRole("row")
      .filter({ hasText: positionDetail })
      .first();

    await expect(row).toBeVisible();

    // -----------------------------------------------------------------------
    // 5) Flag the report and verify status
    // -----------------------------------------------------------------------
    await row.getByRole("button", { name: /flag/i }).click();

    // POST sonrası redirect nereye olursa olsun, tekrar /admin'e dönelim.
    await page.goto("/admin");

    const flaggedRow = page
      .getByRole("row")
      .filter({ hasText: positionDetail })
      .first();

    await expect(flaggedRow).toBeVisible();
    await expect(flaggedRow.getByText(/flagged/i)).toBeVisible();

    // -----------------------------------------------------------------------
    // 6) Restore the report and verify status back to "Active"
    // -----------------------------------------------------------------------
    await flaggedRow.getByRole("button", { name: /restore/i }).click();

    // Yine stabil olması için tekrar /admin'e dön.
    await page.goto("/admin");

    const restoredRow = page
      .getByRole("row")
      .filter({ hasText: positionDetail })
      .first();

    await expect(restoredRow).toBeVisible();
    await expect(restoredRow.getByText(/active/i)).toBeVisible();
  });
});
