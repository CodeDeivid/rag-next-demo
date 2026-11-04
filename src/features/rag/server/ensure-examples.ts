import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ingestDocument } from "./ingest-document";

const EXAMPLES_DIR = path.join(process.cwd(), "examples");
let ready: Promise<void> | null = null;

/** Keeps examples/*.md indexed as shared documents, once per server instance. Safe to call often. */
export function ensureExamples(): Promise<void> {
  ready ??= seed().catch((error) => {
    ready = null; // retry on the next request instead of caching the failure
    throw error;
  });
  return ready;
}

async function seed() {
  const files = (await readdir(EXAMPLES_DIR)).filter((f) => f.endsWith(".md"));
  // Ingestion is idempotent by chunk hash: unchanged files cost no embedding calls,
  // edited ones replace their chunks, so the examples always match the repository.
  for (const name of files) {
    await ingestDocument(name, await readFile(path.join(EXAMPLES_DIR, name), "utf8"), null);
  }
}
