import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { feedback } from "@/db/schema";
import type { FeedbackRequest, FeedbackSummary } from "@/features/feedback/types";

const LATEST_NEGATIVE = 10;

/** One rating per answer per session: rating again replaces the previous one. */
export async function saveFeedback(sessionId: string, input: FeedbackRequest) {
  const values = {
    rating: input.rating,
    comment: input.comment?.trim() || null,
    question: input.question,
    answer: input.answer,
    createdAt: new Date(),
  };
  await db
    .insert(feedback)
    .values({ sessionId, messageId: input.messageId, ...values })
    .onConflictDoUpdate({ target: [feedback.sessionId, feedback.messageId], set: values });
}

export async function getFeedbackSummary(sessionId: string): Promise<FeedbackSummary> {
  const [[counts], latest] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        positive: sql<number>`count(*) filter (where ${feedback.rating} = 1)::int`,
      })
      .from(feedback)
      .where(eq(feedback.sessionId, sessionId)),
    db
      .select({
        id: feedback.id,
        question: feedback.question,
        answer: feedback.answer,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .where(and(eq(feedback.sessionId, sessionId), eq(feedback.rating, -1)))
      .orderBy(desc(feedback.createdAt))
      .limit(LATEST_NEGATIVE),
  ]);
  return {
    total: counts.total,
    positive: counts.positive,
    negative: counts.total - counts.positive,
    latestNegative: latest.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}
