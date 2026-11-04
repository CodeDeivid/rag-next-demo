import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Smoke + a11y checks against a real (empty) database, no LLM: they run on every PR.
for (const colorScheme of ["light", "dark"] as const) {
  test(`has no WCAG 2.1 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("error state has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.route("**/api/documents", (route) =>
    route.fulfill({ status: 500, json: { error: "Could not load documents." } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not load documents." }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("skip link is the first focusable element and moves focus to the chat", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /skip to chat/i });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(":focus")).not.toHaveAttribute("href", /#/);
});

test("Ctrl/Cmd+K focuses the question box", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  await page.goto("/");
  await page.locator("body").click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  await expect(page.getByRole("textbox", { name: /question|ask/i })).toBeFocused();
});
