import { z } from "zod";
import { saveFeedback } from "@/features/feedback/server/feedback-store";
import { consumeRateLimit, RateLimitedError } from "@/features/rag/server/rate-limit";
import { getSessionId } from "@/features/session/server/get-session-id";

const bodySchema = z.object({
  messageId: z.string().min(1).max(200),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(1000).optional(),
  question: z.string().min(1).max(8000),
  answer: z.string().max(8000),
});

export async function POST(req: Request) {
  const sessionId = await getSessionId().catch(() => null);
  if (!sessionId)
    return Response.json({ error: "No session", code: "no_session" }, { status: 401 });
  try {
    await consumeRateLimit(`feedback:${sessionId}`, 30, 60);
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return Response.json({ error: "Too many requests", code: "rate_limited" }, { status: 429 });
    }
    throw error;
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message, code: "invalid_input" },
      { status: 400 },
    );
  }
  await saveFeedback(sessionId, parsed.data);
  return Response.json({ ok: true });
}
