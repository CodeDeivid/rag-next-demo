import { z } from "zod";

const sessionIdSchema = z.uuid();

/** Canonical (lowercase) session id, or null if the value is not one we could have issued. */
export function parseSessionId(value: string | undefined): string | null {
  const parsed = sessionIdSchema.safeParse(value);
  // Lowercase matters: the database treats UUID case variants as one session, so rate-limit keys must too.
  return parsed.success ? parsed.data.toLowerCase() : null;
}
