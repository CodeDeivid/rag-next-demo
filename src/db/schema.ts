import {
  halfvec,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Must match the embedding model output (nvidia/nemotron-3-embed-1b → 2048).
// halfvec, because pgvector's HNSW index caps plain vectors at 2000 dimensions.
export const EMBEDDING_DIMENSIONS = 2048;

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Anonymous session that owns it; null = shared, read-only example.
    sessionId: uuid("session_id"),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("documents_session_name_unique").on(t.sessionId, t.name).nullsNotDistinct(),
    index("documents_session_idx").on(t.sessionId),
  ],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    // sha256 of content: re-uploading the same file inserts nothing new.
    hash: text("hash").notNull(),
    embedding: halfvec("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (t) => [
    // Per document, so the same paragraph in two files stays searchable in both.
    unique("chunks_document_hash_unique").on(t.documentId, t.hash),
    index("chunks_embedding_hnsw").using("hnsw", t.embedding.op("halfvec_cosine_ops")),
  ],
);

// Fixed-window counters per key (session or IP); works across serverless instances.
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
