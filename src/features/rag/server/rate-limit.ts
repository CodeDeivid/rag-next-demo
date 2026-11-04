import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";

export class RateLimitedError extends Error {}

/** Fixed window counter in Postgres; throws once `key` used more than `limit` calls in `windowSeconds`. */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000,
  );
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  // Old windows are useless; dropping them here keeps the table tiny without a cron job.
  if (row.count === 1) {
    await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < now() - interval '1 day'`);
  }
  if (row.count > limit) throw new RateLimitedError("Too many requests, try again in a minute.");
}
