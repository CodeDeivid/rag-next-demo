import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const summary = {
  total: 4,
  positive: 3,
  negative: 1,
  latestNegative: [
    {
      id: "f1",
      question: "What is the hotel limit?",
      answer: "Hotels are covered up to 180 USD per night [1].",
      comment: "It missed the conference hotel exception",
      createdAt: "2026-11-01T14:30:00.000Z",
    },
  ],
};

for (const colorScheme of ["light", "dark"] as const) {
  test(`shows the session approval rate and negative feedback (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.route("**/api/feedback/summary", (route) => route.fulfill({ json: summary }));
    await page.goto("/en/quality");
    await expect(page.getByText("75%")).toBeVisible();
    await expect(page.getByRole("meter", { name: "Approval rate" })).toHaveAttribute(
      "aria-valuenow",
      "75",
    );
    await expect(page.getByText("What is the hotel limit?")).toBeVisible();
    await expect(page.getByText("It missed the conference hotel exception")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("shows the empty state when there is no feedback", async ({ page }) => {
  await page.route("**/api/feedback/summary", (route) =>
    route.fulfill({ json: { total: 0, positive: 0, negative: 0, latestNegative: [] } }),
  );
  await page.goto("/en/quality");
  await expect(page.getByText("No feedback yet")).toBeVisible();
});
