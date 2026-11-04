import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const doc = {
  id: "8dbe8867-48a5-4b27-b917-0143f69adb12",
  name: "handbook.md",
  chunkCount: 3,
  createdAt: "2026-11-04T00:00:00.000Z",
  shared: false,
};

// API is mocked: this checks the UI flow, not the database (covered by the route itself).
test.beforeEach(async ({ page }) => {
  let deleted = false;
  await page.route("**/api/documents", (route) =>
    route.fulfill({ json: { documents: deleted ? [] : [doc] } }),
  );
  await page.route(`**/api/documents/${doc.id}`, (route) => {
    deleted = true;
    return route.fulfill({ status: 204 });
  });
  await page.goto("/en");
  // Below lg the panel lives in a sheet opened from the header.
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await page.getByRole("button", { name: "Documents", exact: true }).click();
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`confirmation dialog has no WCAG 2.1 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.getByRole("button", { name: "Delete handbook.md" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("cancel keeps the document and returns focus to its delete button", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Delete handbook.md" });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", { name: "Delete handbook.md?" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("delete removes the row, announces it and moves focus to upload", async ({ page }) => {
  await page.getByRole("button", { name: "Delete handbook.md" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByText("handbook.md", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Deleted handbook.md")).toBeAttached();
  await expect(page.getByRole("button", { name: "Upload files" })).toBeFocused();
});
