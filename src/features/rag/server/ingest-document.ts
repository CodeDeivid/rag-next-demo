import { createHash } from "node:crypto";
import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { chunkText } from "../core/chunk-text";
import { embedTexts } from "./embedding-provider";
import { purgeExpired } from "./purge-expired";
import { consumeRateLimit } from "./rate-limit";
import { LIMITS } from "./usage-limits";
import type { UploadResult } from "../types";

// Each chunk is one call to the free embeddings API; this keeps one upload within its quota.
export const MAX_CHUNKS_PER_DOCUMENT = 300;

export class DocumentTooLongError extends Error {
  constructor(chunkCount: number) {
    super(
      `The document is too long for this demo (${chunkCount} chunks, max ${MAX_CHUNKS_PER_DOCUMENT}). Split it into smaller files.`,
    );
  }
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

// Matches embedTexts' own batch size, so each call here is exactly one API request.
const EMBED_BATCH_SIZE = 32;

export type IngestProgress =
  { stage: "chunking" } | { stage: "embedding"; done: number; total: number } | { stage: "saving" };

/** `sessionId` null stores a shared, read-only example document. */
export async function ingestDocument(
  name: string,
  text: string,
  sessionId: string | null,
  onProgress?: (progress: IngestProgress) => void,
): Promise<UploadResult> {
  onProgress?.({ stage: "chunking" });
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
    await purgeExpired(tx);

    const [doc] = await tx
      .insert(documents)
      .values({ name, sessionId })
      .onConflictDoUpdate({ target: [documents.sessionId, documents.name], set: { name } }) // no-op so `returning` works
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
      const vectors: number[][] = [];
      onProgress?.({ stage: "embedding", done: 0, total: fresh.length });
      for (let i = 0; i < fresh.length; i += EMBED_BATCH_SIZE) {
        const batch = fresh.slice(i, i + EMBED_BATCH_SIZE).map((p) => p.content);
        const { limit, windowSeconds } = LIMITS.embeddingBatchesGlobalDaily;
        await consumeRateLimit("global:embed", limit, windowSeconds);
        vectors.push(...(await embedTexts(batch)));
        onProgress?.({ stage: "embedding", done: vectors.length, total: fresh.length });
      }
      onProgress?.({ stage: "saving" });
      await tx
        .insert(chunks)
        .values(fresh.map((p, i) => ({ ...p, documentId: doc.id, embedding: vectors[i] })));
    }

    if (!fresh.length) onProgress?.({ stage: "saving" });

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
      document: {
        id: doc.id,
        name: doc.name,
        chunkCount,
        createdAt: doc.createdAt.toISOString(),
        shared: doc.sessionId === null,
      },
      chunksInserted: fresh.length,
      chunksSkipped: pieces.length - fresh.length,
    };
  });
}
