import { cosineDistance, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import type { RetrievedChunk } from "../types";
import { embedTexts } from "./embedding-provider";

/** Top-k chunks among the session's documents and the shared examples. */
export async function searchChunks(
  query: string,
  sessionId: string,
  k = 5,
): Promise<RetrievedChunk[]> {
  const [vector] = await embedTexts([query]);
  const distance = cosineDistance(chunks.embedding, vector);
  return db
    .select({
      id: chunks.id,
      documentName: documents.name,
      chunkIndex: chunks.chunkIndex,
      content: chunks.content,
      score: sql<number>`1 - (${distance})`.mapWith(Number),
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(or(eq(documents.sessionId, sessionId), isNull(documents.sessionId)))
    .orderBy(distance)
    .limit(k);
}
