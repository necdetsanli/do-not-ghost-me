// tests/e2e/security.inlineStyles.spec.ts
import { test, expect } from "./fixtures";

/**
 * Basic safety check:
 * Public pages should not contain unexpected <style> tags injected
 * into the body (we allow framework-managed styles in <head>).
 */
test.describe("security: inline styles", () => {
  test("no unexpected <style> tags in main public pages", async ({ page }) => {
    const paths = ["/", "/companies"];

    for (const path of paths) {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();

      const html = await page.content();
      const [, bodySegment = ""] = html.split("</head>");

      // Heuristic: disallow <style> tags in the body segment.
      expect(bodySegment.toLowerCase()).not.toContain("<style");
    }
  });
});
