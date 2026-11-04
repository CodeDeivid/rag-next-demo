import { expect, request, test } from "@playwright/test";

const feedbackBody = {
  messageId: "m1",
  rating: 1,
  question: "q",
  answer: "a",
};

test("changing the case of the session cookie does not reset the rate limit", async ({
  baseURL,
}) => {
  const id = crypto.randomUUID();
  const post = async (cookieId: string) => {
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: `rag_session=${cookieId}` },
    });
    return (await ctx.post("/api/feedback", { data: feedbackBody })).status();
  };
  let status = 200;
  for (let i = 0; i < 40 && status === 200; i++) status = await post(id);
  expect(status).toBe(429);
  expect(await post(id.toUpperCase())).toBe(429);
});

test("a cross-origin write is refused", async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post("/api/feedback", {
    data: feedbackBody,
    headers: { origin: "https://evil.example" },
  });
  expect(res.status()).toBe(403);
});

test("a malformed or unissued session cookie is replaced instead of locking the visitor out", async ({
  baseURL,
}) => {
  for (const cookie of ["rag_session=00000000-0000-0000-0000-000000000001", "rag_session=hacked"]) {
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { cookie } });
    expect((await ctx.get("/api/documents")).status()).toBe(200);
  }
});

test("a file name that is too long is refused before any embedding work", async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post("/api/documents", {
    multipart: {
      file: { name: `${"a".repeat(200)}.md`, mimeType: "text/markdown", buffer: Buffer.from("hi") },
    },
  });
  expect(res.status()).toBe(400);
});

test("security headers are present", async ({ baseURL }) => {
  const res = await (await request.newContext({ baseURL })).get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
});
