import type { UIMessage } from "ai";

/** A chunk returned by vector search. score = 1 - cosine distance (higher is closer). */
export type RetrievedChunk = {
  id: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export type DocumentSummary = {
  id: string;
  name: string;
  chunkCount: number;
  createdAt: string; // ISO
  /** Shared example: visible to everyone, cannot be deleted. */
  shared: boolean;
};

export type UploadResult = {
  document: DocumentSummary;
  chunksInserted: number;
  chunksSkipped: number;
};

/** Custom data part streamed before the answer text: `data-sources`. */
export type RagUIMessage = UIMessage<never, { sources: { chunks: RetrievedChunk[] } }>;

/** Error text the chat route sends when the free tier says 429. The UI matches on it. */
export const RATE_LIMIT_ERROR = "rate_limited";

export const NOT_FOUND_ANSWER = "não encontrei nos documentos";
