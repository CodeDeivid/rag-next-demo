import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../session-cookie";
import { parseSessionId } from "../session-id";

export class MissingSessionError extends Error {}

/** The caller's anonymous session. Only ever read from the httpOnly cookie, never from the body. */
export async function getSessionId(): Promise<string> {
  const id = parseSessionId((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) throw new MissingSessionError("No session");
  return id;
}
