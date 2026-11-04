import {
  index,
  integer,
  unique,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// Must match the embedding model output (paraphrase-multilingual-MiniLM-L12-v2 → 384).
export const EMBEDDING_DIMENSIONS = 384;

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (t) => [
    // Per document, so the same paragraph in two files stays searchable in both.
    unique("chunks_document_hash_unique").on(t.documentId, t.hash),
    index("chunks_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);
