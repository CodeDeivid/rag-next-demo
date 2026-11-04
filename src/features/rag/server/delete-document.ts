import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

/** Deletes one of the session's documents (chunks go by cascade). False when missing, shared or someone else's. */
export async function deleteDocument(id: string, sessionId: string): Promise<boolean> {
  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.sessionId, sessionId)))
    .returning({ id: documents.id });
  return deleted.length > 0;
}
