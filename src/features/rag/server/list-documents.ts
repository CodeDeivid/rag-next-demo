import { count, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import type { DocumentSummary } from "../types";

/** The session's own uploads plus the shared examples. */
export async function listDocuments(sessionId: string): Promise<DocumentSummary[]> {
  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      createdAt: documents.createdAt,
      sessionId: documents.sessionId,
      chunkCount: count(chunks.id),
    })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(or(eq(documents.sessionId, sessionId), isNull(documents.sessionId)))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));
  return rows.map(({ sessionId: owner, ...r }) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    shared: owner === null,
  }));
}
