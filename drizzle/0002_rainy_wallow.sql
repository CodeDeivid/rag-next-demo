CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_session_message_unique" UNIQUE("session_id","message_id")
);
--> statement-breakpoint
CREATE INDEX "feedback_session_created_idx" ON "feedback" USING btree ("session_id","created_at");