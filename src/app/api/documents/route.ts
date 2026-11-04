import { connection } from "next/server";
import { z } from "zod";
import { extractText } from "@/features/rag/server/extract-text";
import { DocumentTooLongError, ingestDocument } from "@/features/rag/server/ingest-document";
import { ensureExamples } from "@/features/rag/server/ensure-examples";
import { listDocuments } from "@/features/rag/server/list-documents";
import { consumeRateLimit, RateLimitedError } from "@/features/rag/server/rate-limit";
import { getSessionId, MissingSessionError } from "@/features/session/server/get-session-id";
import type { DocumentErrorCode, UploadEvent } from "@/features/documents/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const uploadSchema = z.object({
  file: z
    .file({ error: "Send the file in the `file` field" })
    .min(1, "The file is empty")
    .max(MAX_FILE_BYTES, "The file is larger than 5 MB")
    .refine(
      (f) => /\.(md|markdown|txt|pdf)$/i.test(f.name),
      "Only .md, .markdown, .txt and .pdf are accepted",
    ),
});

const ISSUE_CODES: Record<string, DocumentErrorCode> = {
  invalid_type: "file_missing",
  too_small: "file_empty",
  too_big: "file_too_large",
  custom: "unsupported_type",
};

const fail = (status: number, code: DocumentErrorCode, error: string) =>
  Response.json({ error, code }, { status });

export async function GET() {
  await connection(); // always read the live list, never a build-time prerender
  const sessionId = await getSessionId().catch(() => null);
  if (!sessionId) return fail(401, "no_session", "No session");
  await ensureExamples().catch((error) => console.error("[examples]", error));
  return Response.json({ documents: await listDocuments(sessionId) });
}

export async function POST(req: Request) {
  // Refuse before buffering the body; +64 KB leaves room for the multipart envelope.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE_BYTES + 64 * 1024) {
    return fail(413, "file_too_large", "The file is larger than 5 MB");
  }
  let sessionId: string;
  try {
    sessionId = await getSessionId();
    await consumeRateLimit(`upload:${sessionId}`, 10, 60 * 10);
  } catch (error) {
    if (error instanceof MissingSessionError) return fail(401, "no_session", "No session");
    if (error instanceof RateLimitedError) return fail(429, "rate_limited", error.message);
    throw error;
  }
  const form = await req.formData().catch(() => null);
  const parsed = uploadSchema.safeParse({ file: form?.get("file") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code = ISSUE_CODES[issue.code] ?? "file_missing";
    return fail(code === "file_too_large" ? 413 : 400, code, issue.message);
  }
  const { file } = parsed.data;

  const text = await extractText(file).catch(() => null);
  if (!text?.trim()) {
    return file.name.toLowerCase().endsWith(".pdf")
      ? fail(422, "pdf_no_text", "No extractable text in this PDF (scanned image?)")
      : fail(422, "no_text", "The file has no text");
  }

  // From here the response is a stream of progress lines, so failures become an `error` line.
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: UploadEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      send({ stage: "received" });
      try {
        const result = await ingestDocument(file.name, text, sessionId, send);
        send({ stage: "done", result });
      } catch (error) {
        if (error instanceof DocumentTooLongError) {
          send({ stage: "error", code: "document_too_long", error: error.message });
        } else {
          console.error("[upload]", error);
          send({ stage: "error", code: "upload_failed", error: "Upload failed" });
        }
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
