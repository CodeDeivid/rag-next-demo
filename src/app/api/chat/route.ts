import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { buildSystemPrompt } from "@/features/rag/core/build-prompt";
import { getChatModel, toChatErrorMessage } from "@/features/rag/server/generation-provider";
import { getClientIp } from "@/features/rag/server/client-ip";
import { consumeRateLimit, RateLimitedError } from "@/features/rag/server/rate-limit";
import { LIMITS } from "@/features/rag/server/usage-limits";
import { searchChunks } from "@/features/rag/server/search-chunks";
import { getSessionId } from "@/features/session/server/get-session-id";
import { RATE_LIMIT_ERROR, type RagUIMessage } from "@/features/rag/types";

// Free-tier Vercel cuts functions at 10s by default; a streamed answer can take longer.
export const maxDuration = 60;

// Caps keep one request from burning the free quota or overflowing the model context.
const MAX_MESSAGES = 50;
const MAX_TEXT_LENGTH = 4000;
const HISTORY_SENT_TO_MODEL = 10;
const MAX_TOTAL_CHARS = 20_000; // across everything sent to the model, not per part
const MAX_BODY_BYTES = 200_000;
const MAX_OUTPUT_TOKENS = 1200;

const bodySchema = z.object({
  messages: z
    .array(
      z.looseObject({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        parts: z
          .array(
            z.looseObject({ type: z.string(), text: z.string().max(MAX_TEXT_LENGTH).optional() }),
          )
          .max(20),
      }),
    )
    .min(1, "messages must not be empty")
    .max(MAX_MESSAGES, "conversation is too long, start a new one")
    .refine((m) => m.at(-1)?.role === "user", "the last message must be from the user"),
});

export async function POST(req: Request) {
  const sessionId = await getSessionId().catch(() => null);
  if (!sessionId)
    return Response.json({ error: "No session", code: "no_session" }, { status: 401 });
  // Per session and per IP (dropping the cookie must not reset the budget), plus a daily budget for everyone.
  const ip = getClientIp(req);
  try {
    for (const [key, { limit, windowSeconds }] of [
      [`chat:${sessionId}`, LIMITS.chatPerSession],
      [`chat-ip:${ip}`, LIMITS.chatPerIp],
      ["global:chat", LIMITS.chatGlobalDaily],
    ] as const) {
      await consumeRateLimit(key, limit, windowSeconds);
    }
  } catch (error) {
    // Same text the stream uses for a provider 429, so the UI shows one friendly message.
    if (error instanceof RateLimitedError) return new Response(RATE_LIMIT_ERROR, { status: 429 });
    throw error;
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: "Request too large", code: "invalid_input" }, { status: 413 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message, code: "invalid_input" },
      { status: 400 },
    );
  }
  // Rebuild as text-only: a client-sent file/url part would make the server fetch that URL (SSRF).
  const messages: RagUIMessage[] = parsed.data.messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts.flatMap((p) =>
      p.type === "text" && typeof p.text === "string"
        ? [{ type: "text" as const, text: p.text }]
        : [],
    ),
  }));
  const sent = messages.slice(-HISTORY_SENT_TO_MODEL);
  const totalChars = sent.reduce(
    (sum, m) => sum + m.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0),
    0,
  );
  if (totalChars > MAX_TOTAL_CHARS) {
    return Response.json(
      { error: "Conversation is too long, start a new one", code: "invalid_input" },
      { status: 400 },
    );
  }
  const question = messages
    .at(-1)!
    .parts.flatMap((p) => (p.type === "text" ? [p.text] : []))
    .join("\n")
    .trim();
  if (!question)
    return Response.json(
      { error: "the last message has no text", code: "empty_question" },
      { status: 400 },
    );

  const stream = createUIMessageStream<RagUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      const chunks = await searchChunks(question, sessionId);
      // Sources go first so the UI can show them even if generation fails.
      writer.write({ type: "data-sources", data: { chunks } });

      const result = streamText({
        model: getChatModel(),
        instructions: buildSystemPrompt(chunks),
        messages: await convertToModelMessages(sent),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: req.signal,
        maxRetries: 1, // free tier 429s rarely clear in seconds; fail fast instead of making the user wait
      });
      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          sendStart: false,
          onError: toChatErrorMessage,
          onEnd: ({ outcome }) => writer.setOutcome(outcome),
        }),
      );
    },
    onError: toChatErrorMessage,
  });

  return createUIMessageStreamResponse({ stream });
}
