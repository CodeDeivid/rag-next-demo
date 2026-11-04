import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import type { DocumentSummary } from "../types";

export async function listDocuments(): Promise<DocumentSummary[]> {
  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      createdAt: documents.createdAt,
      chunkCount: count(chunks.id),
    })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
