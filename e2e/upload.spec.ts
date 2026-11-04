import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const result = {
  document: {
    id: "1f0c2f7e-3d0b-4a57-9c1e-7b8f5e2a9d10",
    name: "notes.md",
    chunkCount: 3,
    createdAt: "2026-11-04T00:00:00.000Z",
    shared: false,
  },
  chunksInserted: 2,
  chunksSkipped: 1,
};
const ndjson = (...events: object[]) => events.map((e) => JSON.stringify(e)).join("\n") + "\n";
const file = {
  name: "notes.md",
  mimeType: "text/markdown",
  buffer: Buffer.from("# Notes\n\nHello."),
};

// The documents panel: desktop shows it inline, mobile opens it from the header.
async function panel(page: Page) {
  const narrow = (page.viewportSize()?.width ?? 1280) < 1024;
  if (narrow) await page.getByRole("button", { name: "Documents", exact: true }).click();
  return page.getByRole("region", { name: "Documents", exact: true }).last();
}

async function pick(page: Page, files: Parameters<Page["setInputFiles"]>[1]) {
  const chooser = page.waitForEvent("filechooser");
  const region = await panel(page);
  await region.getByRole("button", { name: "Upload files" }).click();
  await (await chooser).setFiles(files);
  return region.getByRole("list", { name: "Uploads" });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/documents", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { documents: [] } })
      : route.fallback(),
  );
});

test("shows each stage and the final counts", async ({ page }) => {
  // Hold the stream open between lines so each stage is observable.
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: ndjson(
        { stage: "received" },
        { stage: "chunking" },
        { stage: "embedding", done: 0, total: 2 },
        { stage: "embedding", done: 2, total: 2 },
        { stage: "saving" },
        { stage: "done", result },
      ),
    });
  });
  await page.goto("/en");
  const uploads = await pick(page, file);
  await expect(uploads.getByText("Ready: 2 new chunks, 1 already indexed")).toBeVisible();
  await expect(
    page.getByText("notes.md: Ready: 2 new chunks, 1 already indexed").first(),
  ).toBeAttached();
});

test("progress stages appear in order", async ({ page }) => {
  // Intercepted responses arrive in one piece, so this test swaps in an XHR that streams lines.
  await page.addInitScript(
    (lines: string[]) => {
      class StreamingXhr {
        status = 0;
        responseText = "";
        upload: { onprogress?: (e: object) => void } = {};
        onprogress?: () => void;
        onload?: () => void;
        onerror?: () => void;
        open() {}
        async send() {
          this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 });
          this.status = 200;
          for (const line of lines) {
            await new Promise((r) => setTimeout(r, 1000));
            this.responseText += `${line}\n`;
            this.onprogress?.();
          }
          this.onload?.();
        }
      }
      Object.assign(window, { XMLHttpRequest: StreamingXhr });
    },
    [
      { stage: "received" },
      { stage: "chunking" },
      { stage: "embedding", done: 1, total: 4 },
      { stage: "saving" },
      { stage: "done", result },
    ].map((e) => JSON.stringify(e)),
  );
  await page.goto("/en");
  const uploads = await pick(page, file);
  for (const text of [
    "Received",
    "Splitting into chunks",
    "Creating embeddings 1 of 4",
    "Saving",
    "Ready: 2 new chunks, 1 already indexed",
  ]) {
    await expect(uploads.getByText(text, { exact: true })).toBeVisible();
  }
});

test("an error line shows the translated message with Retry", async ({ page }) => {
  await page.route("**/api/documents", (route) =>
    route.request().method() !== "POST"
      ? route.fallback()
      : route.fulfill({
          contentType: "application/x-ndjson",
          body: ndjson(
            { stage: "received" },
            { stage: "error", code: "document_too_long", error: "raw" },
          ),
        }),
  );
  await page.goto("/en");
  const uploads = await pick(page, file);
  await expect(
    uploads.getByText("The document is too long for this demo.", { exact: false }),
  ).toBeVisible();
  await expect(uploads.getByText("raw", { exact: true })).toHaveCount(0);
  await expect(uploads.getByRole("button", { name: "Retry notes.md" })).toBeVisible();
});

test("an unsupported file is rejected without uploading", async ({ page }) => {
  let posted = false;
  await page.route("**/api/documents", (route) => {
    if (route.request().method() === "POST") posted = true;
    return route.fallback();
  });
  await page.goto("/en");
  const uploads = await pick(page, {
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("x"),
  });
  await expect(
    uploads.getByText("Only .md, .markdown, .txt and .pdf files are accepted."),
  ).toBeVisible();
  await expect(uploads.getByRole("button", { name: "Retry photo.png" })).toHaveCount(0);
  expect(posted).toBe(false);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`upload in progress has no WCAG 2.1 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    // Never fulfilled: the row stays mid-upload while axe runs.
    await page.route("**/api/documents", (route) =>
      route.request().method() === "POST" ? new Promise(() => {}) : route.fallback(),
    );
    await page.goto("/en");
    const uploads = await pick(page, file);
    await expect(uploads.getByRole("progressbar")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("works inside the documents sheet at 375×667", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.route("**/api/documents", (route) =>
    route.request().method() !== "POST"
      ? route.fallback()
      : route.fulfill({
          contentType: "application/x-ndjson",
          body: ndjson({ stage: "done", result }),
        }),
  );
  await page.goto("/en");
  const uploads = await pick(page, file);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(uploads.getByText("Ready: 2 new chunks", { exact: false })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
