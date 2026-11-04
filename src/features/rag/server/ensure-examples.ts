import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, isNull, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { ingestDocument } from "./ingest-document";

const EXAMPLES_DIR = path.join(process.cwd(), "examples");
let ready: Promise<void> | null = null;

/** Indexes examples/*.md as shared documents the first time they are missing. Safe to call often. */
export function ensureExamples(): Promise<void> {
  ready ??= seed().catch((error) => {
    ready = null; // retry on the next request instead of caching the failure
    throw error;
  });
  return ready;
}

async function seed() {
  const files = (await readdir(EXAMPLES_DIR)).filter((f) => f.endsWith(".md"));
  for (const name of files) {
    const [existing] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(isNull(documents.sessionId), eq(documents.name, name)));
    if (!existing)
      await ingestDocument(name, await readFile(path.join(EXAMPLES_DIR, name), "utf8"), null);
  }
}
