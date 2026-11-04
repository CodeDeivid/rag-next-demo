import { expect, request, test } from "@playwright/test";

test("a session cannot list, search or delete another session's documents", async ({ baseURL }) => {
  test.setTimeout(90_000); // the free embeddings API can be slow
  // Uploading needs real embeddings, so this runs only where an OpenRouter key is set.
  test.skip(!process.env.OPENROUTER_API_KEY?.startsWith("sk-"), "needs a real OPENROUTER_API_KEY");
  const alice = await request.newContext({ baseURL });
  const bob = await request.newContext({ baseURL });
  const name = `private-${Date.now()}.md`;

  const upload = await alice.post("/api/documents", {
    multipart: {
      file: { name, mimeType: "text/markdown", buffer: Buffer.from("The vault code is 4815.") },
    },
  });
  expect(upload.ok()).toBe(true);
  // The upload streams NDJSON progress; the last line carries the result.
  const lines = (await upload.text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  const done = lines.at(-1);
  expect(done.stage).toBe("done");
  const { document } = done.result;

  const bobList = await (await bob.get("/api/documents")).json();
  expect(bobList.documents.map((d: { name: string }) => d.name)).not.toContain(name);

  expect((await bob.delete(`/api/documents/${document.id}`)).status()).toBe(404);

  const chat = await bob.post("/api/chat", {
    data: {
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "What is the vault code?" }] },
      ],
    },
  });
  expect(await chat.text()).not.toContain(name);

  expect((await alice.delete(`/api/documents/${document.id}`)).status()).toBe(204);
});

test("a tampered session cookie gets a fresh session instead of an error", async ({ baseURL }) => {
  const ctx = await request.newContext({
    baseURL,
    extraHTTPHeaders: { cookie: "rag_session=not-a-uuid" },
  });
  expect((await ctx.get("/api/documents")).status()).toBe(200);
});
