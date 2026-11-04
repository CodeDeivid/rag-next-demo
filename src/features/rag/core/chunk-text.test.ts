import { describe, expect, it } from "vitest";
import { CHUNK_OVERLAP, CHUNK_SIZE, chunkText } from "./chunk-text";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    expect(chunkText("Hello   world.\n")).toEqual(["Hello world."]);
  });

  it("returns [] for whitespace-only input", () => {
    expect(chunkText(" \n\t \n\n ")).toEqual([]);
  });

  it("never exceeds size and uses the defaults", () => {
    const chunks = chunkText(words(1000));
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(CHUNK_SIZE);
    expect(CHUNK_OVERLAP).toBeLessThan(CHUNK_SIZE);
  });

  it("shares overlap text between consecutive chunks", () => {
    const chunks = chunkText(words(300), { size: 200, overlap: 50 });
    for (let i = 1; i < chunks.length; i++) {
      const head = chunks[i].slice(0, 15);
      expect(chunks[i - 1]).toContain(head);
    }
  });

  it("prefers paragraph boundaries", () => {
    const a = "A".repeat(10) + " " + "a".repeat(80);
    const b = "B".repeat(150);
    const chunks = chunkText(`${a}\n\n${b}`, { size: 120, overlap: 10 });
    expect(chunks[0]).toBe(a);
  });

  it("prefers sentence boundaries over mid-sentence cuts", () => {
    const text = "First sentence is here. Second sentence goes on and on without stopping for long";
    const chunks = chunkText(text, { size: 40, overlap: 5 });
    expect(chunks[0]).toBe("First sentence is here.");
  });

  it("cuts a single huge word at size", () => {
    const chunks = chunkText("x".repeat(250), { size: 100, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(100);
  });

  it("rejects overlap >= size", () => {
    expect(() => chunkText("abc", { size: 10, overlap: 10 })).toThrow();
    expect(() => chunkText("abc", { size: 10, overlap: 20 })).toThrow();
  });
  it("keeps Markdown list items on their own lines", () => {
    expect(chunkText("Limits:\n- Meals: 60 USD\n- Hotels: 180 USD")).toEqual([
      "Limits:\n- Meals: 60 USD\n- Hotels: 180 USD",
    ]);
  });
});
