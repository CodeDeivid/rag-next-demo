import { and, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, feedback } from "@/db/schema";
import { FEEDBACK_TTL_DAYS, UPLOAD_TTL_HOURS } from "./usage-limits";

type Executor = Pick<typeof db, "delete">;

/** Removes expired uploads (chunks go by cascade) and old feedback. Shared examples are never touched. */
export async function purgeExpired(executor: Executor = db) {
  await executor
    .delete(documents)
    .where(
      and(
        isNotNull(documents.sessionId),
        lt(documents.createdAt, sql`now() - make_interval(hours => ${UPLOAD_TTL_HOURS})`),
      ),
    );
  await executor
    .delete(feedback)
    .where(lt(feedback.createdAt, sql`now() - make_interval(days => ${FEEDBACK_TTL_DAYS})`));
}
