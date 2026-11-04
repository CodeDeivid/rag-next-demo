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
import { consumeRateLimit, RateLimitedError } from "@/features/rag/server/rate-limit";
import { searchChunks } from "@/features/rag/server/search-chunks";
import { getSessionId } from "@/features/session/server/get-session-id";
import { RATE_LIMIT_ERROR, type RagUIMessage } from "@/features/rag/types";

// Caps keep one request from burning the free quota or overflowing the model context.
const MAX_MESSAGES = 50;
const MAX_TEXT_LENGTH = 4000;
const HISTORY_SENT_TO_MODEL = 10;

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
  if (!sessionId) return Response.json({ error: "No session" }, { status: 401 });
  // Per session and per IP: dropping the cookie must not reset the budget.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  try {
    await consumeRateLimit(`chat:${sessionId}`, 15, 60);
    await consumeRateLimit(`chat-ip:${ip}`, 40, 60);
  } catch (error) {
    // Same text the stream uses for a provider 429, so the UI shows one friendly message.
    if (error instanceof RateLimitedError) return new Response(RATE_LIMIT_ERROR, { status: 429 });
    throw error;
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
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
  const question = messages
    .at(-1)!
    .parts.flatMap((p) => (p.type === "text" ? [p.text] : []))
    .join("\n")
    .trim();
  if (!question) return Response.json({ error: "the last message has no text" }, { status: 400 });

  const stream = createUIMessageStream<RagUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      const chunks = await searchChunks(question, sessionId);
      // Sources go first so the UI can show them even if generation fails.
      writer.write({ type: "data-sources", data: { chunks } });

      const result = streamText({
        model: getChatModel(),
        instructions: buildSystemPrompt(chunks),
        messages: await convertToModelMessages(messages.slice(-HISTORY_SENT_TO_MODEL)),
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
