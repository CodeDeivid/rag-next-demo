import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

/** Deletes a document; its chunks go with it (ON DELETE CASCADE). Returns false when it did not exist. */
export async function deleteDocument(id: string): Promise<boolean> {
  const deleted = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ id: documents.id });
  return deleted.length > 0;
}
