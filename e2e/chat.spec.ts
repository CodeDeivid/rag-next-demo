import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const chunks = [
  {
    id: "c1",
    documentName: "remote-work-policy.md",
    chunkIndex: 0,
    content: "Every employee who has finished onboarding can work remotely up to four days a week.",
    score: 0.82,
  },
];

function stream(text: string) {
  const events = [
    { type: "start", messageId: "a1" },
    { type: "data-sources", data: { chunks } },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish" },
  ];
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
}

async function mockChat(page: Page, answer: string) {
  await page.route("**/api/documents", (route) =>
    route.fulfill({
      json: {
        documents: [
          {
            id: "d1",
            name: "remote-work-policy.md",
            chunkCount: 3,
            createdAt: new Date().toISOString(),
            shared: true,
          },
        ],
      },
    }),
  );
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
      body: stream(answer),
    }),
  );
}

const ANSWER = "You can work remotely **up to four days a week** [1].";

async function askExample(page: Page) {
  await page.goto("/en");
  await page.getByRole("button", { name: /how many days a week/i }).click();
  await expect(page.getByText("up to four days a week", { exact: true })).toBeVisible();
}

test("clicking an example question sends it and shows the answer", async ({ page }) => {
  await mockChat(page, ANSWER);
  await askExample(page);
  await expect(page.getByRole("list", { name: "Conversation" })).toContainText(
    "How many days a week can I work remotely?",
  );
});

test("the not-found reply renders as a card, not the raw text", async ({ page }) => {
  await mockChat(page, "Não encontrei nos documentos.");
  await page.goto("/en");
  await page.getByRole("button", { name: /learning budget/i }).click();
  await expect(page.getByText("Not in your documents")).toBeVisible();
  await expect(page.getByText("Não encontrei nos documentos.")).toHaveCount(0);
});

test("copy puts the answer on the clipboard", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockChat(page, ANSWER);
  await askExample(page);
  await page.getByRole("button", { name: "Copy answer" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ANSWER);
});

test("thumbs down with a comment posts feedback", async ({ page }) => {
  await mockChat(page, ANSWER);
  const bodies: unknown[] = [];
  await page.route("**/api/feedback", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await askExample(page);
  await page.getByRole("button", { name: "Not helpful" }).click();
  await page.getByLabel(/what was wrong/i).fill("Missing the office day rule");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Not helpful" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toMatchObject({
    rating: -1,
    comment: "Missing the office day rule",
    question: "How many days a week can I work remotely?",
    answer: ANSWER,
  });
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`an answer on screen has no WCAG 2.1 AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await mockChat(page, ANSWER);
    await askExample(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("on a phone the sources chip opens the sources sheet", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mockChat(page, ANSWER);
  await askExample(page);
  await page.getByRole("button", { name: "1 source" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("meter", { name: "Similarity" })).toHaveAttribute(
    "aria-valuenow",
    "82",
  );
});
