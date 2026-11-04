import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE } from "../session-cookie";

export class MissingSessionError extends Error {}

/** The caller's anonymous session. Only ever read from the httpOnly cookie, never from the body. */
export async function getSessionId(): Promise<string> {
  const parsed = z.uuid().safeParse((await cookies()).get(SESSION_COOKIE)?.value);
  if (!parsed.success) throw new MissingSessionError("No session");
  return parsed.data;
}
