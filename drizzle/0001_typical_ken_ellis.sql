-- Embeddings moved from a local 384-d model to a 2048-d API model: old vectors cannot be reused.
TRUNCATE "chunks", "documents";--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_name_unique";--> statement-breakpoint
DROP INDEX "chunks_embedding_hnsw";--> statement-breakpoint
ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE halfvec(2048);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "session_id" uuid;--> statement-breakpoint
CREATE INDEX "documents_session_idx" ON "documents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chunks_embedding_hnsw" ON "chunks" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_session_name_unique" UNIQUE NULLS NOT DISTINCT("session_id","name");