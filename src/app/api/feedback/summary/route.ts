import { connection } from "next/server";
import { getFeedbackSummary } from "@/features/feedback/server/feedback-store";
import { getSessionId } from "@/features/session/server/get-session-id";

export async function GET() {
  await connection(); // per-session data, never prerendered
  const sessionId = await getSessionId().catch(() => null);
  if (!sessionId)
    return Response.json({ error: "No session", code: "no_session" }, { status: 401 });
  return Response.json(await getFeedbackSummary(sessionId));
}
