import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The devices a recruiter or hiring manager is likely to open the link on.
const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 15", width: 393, height: 852 },
  { name: "Pixel 7", width: 412, height: 915 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "notebook", width: 1366, height: 768 },
  { name: "MacBook", width: 1440, height: 900 },
  { name: "monitor", width: 1920, height: 1080 },
];

test.describe("layout on common devices", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  for (const vp of VIEWPORTS) {
    test(`${vp.name} ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.route("**/api/documents", (route) => route.fulfill({ json: { documents: [] } }));
      await page.goto("/");

      const composer = page.locator("#question");
      await expect(composer).toBeVisible();
      await expect(composer).toBeInViewport();
      await expect(page.getByRole("banner")).toBeInViewport();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
