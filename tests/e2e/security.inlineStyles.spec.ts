// tests/e2e/security.inlineStyles.spec.ts
import { test, expect } from "@playwright/test";

/**
 * Ensures that the rendered home page does not contain any inline `style`
 * attributes. This is a hard guardrail for keeping a strict `style-src`
 * Content Security Policy (no `'unsafe-inline'`).
 *
 * NOTE: This test will currently fail as long as React components use
 * `style={{ ... }}` props, because those become `style=""` attributes
 * in the HTML. Once you migrate to CSS classes, this should pass.
 */
test("home page does not use inline style attributes", async ({ page }) => {
  const response = await page.goto("/");

  // Sanity check: page loaded successfully
  expect(response?.ok()).toBeTruthy();

  const elementsWithStyle = await page.$$eval("[style]", (nodes) =>
    nodes.map((node) => ({
      tag: node.tagName,
      id: (node as HTMLElement).id,
      className: (node as HTMLElement).className,
    })),
  );

  // For debugging, log what we found if the assertion fails
  console.log("Elements with inline style:", elementsWithStyle);

  expect(elementsWithStyle).toEqual([]);
});
