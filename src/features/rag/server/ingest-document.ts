import { createHash } from "node:crypto";
import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { chunkText } from "../core/chunk-text";
import { embedTexts } from "./embedding-provider";
import type { UploadResult } from "../types";

// Embeddings run on the server CPU inside the request; this bounds one upload to a few seconds.
export const MAX_CHUNKS_PER_DOCUMENT = 300;

export class DocumentTooLongError extends Error {
  constructor(chunkCount: number) {
    super(
      `The document is too long for this demo (${chunkCount} chunks, max ${MAX_CHUNKS_PER_DOCUMENT}). Split it into smaller files.`,
    );
  }
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export async function ingestDocument(name: string, text: string): Promise<UploadResult> {
  const pieces = chunkText(text).map((content, chunkIndex) => ({
    content,
    chunkIndex,
    hash: sha256(content),
  }));
  if (pieces.length > MAX_CHUNKS_PER_DOCUMENT) throw new DocumentTooLongError(pieces.length);
  // Same paragraph twice in one file: keep the first occurrence.
  const uniquePieces = pieces.filter((p, i) => pieces.findIndex((q) => q.hash === p.hash) === i);

  // One transaction: a failed embedding leaves no empty document behind. The upsert locks the
  // document row until commit, so two uploads of the same name run one after the other.
  return db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(documents)
      .values({ name })
      .onConflictDoUpdate({ target: documents.name, set: { name } }) // no-op so `returning` works
      .returning();

    const known = await tx
      .select({ hash: chunks.hash })
      .from(chunks)
      .where(
        and(
          eq(chunks.documentId, doc.id),
          inArray(
            chunks.hash,
            uniquePieces.map((p) => p.hash),
          ),
        ),
      );
    const knownHashes = new Set(known.map((k) => k.hash));
    const fresh = uniquePieces.filter((p) => !knownHashes.has(p.hash));

    // Embedding is the slow part, so only new chunks get vectors.
    if (fresh.length) {
      const vectors = await embedTexts(fresh.map((p) => p.content));
      await tx
        .insert(chunks)
        .values(fresh.map((p, i) => ({ ...p, documentId: doc.id, embedding: vectors[i] })));
    }

    // Unchanged chunks may have moved inside an edited file; keep "Chunk #n" accurate.
    await Promise.all(
      uniquePieces
        .filter((p) => knownHashes.has(p.hash))
        .map((p) =>
          tx
            .update(chunks)
            .set({ chunkIndex: p.chunkIndex })
            .where(and(eq(chunks.documentId, doc.id), eq(chunks.hash, p.hash))),
        ),
    );

    // An edited file re-uploaded under the same name must not keep answering from its old text.
    await tx.delete(chunks).where(
      and(
        eq(chunks.documentId, doc.id),
        notInArray(
          chunks.hash,
          uniquePieces.map((p) => p.hash),
        ),
      ),
    );

    const [{ chunkCount }] = await tx
      .select({ chunkCount: count() })
      .from(chunks)
      .where(eq(chunks.documentId, doc.id));

    return {
      document: { id: doc.id, name: doc.name, chunkCount, createdAt: doc.createdAt.toISOString() },
      chunksInserted: fresh.length,
      chunksSkipped: pieces.length - fresh.length,
    };
  });
}
