import { connection } from "next/server";
import { z } from "zod";
import { extractText } from "@/features/rag/server/extract-text";
import { DocumentTooLongError, ingestDocument } from "@/features/rag/server/ingest-document";
import { listDocuments } from "@/features/rag/server/list-documents";

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

export async function GET() {
  await connection(); // always read the live list, never a build-time prerender
  return Response.json({ documents: await listDocuments() });
}

export async function POST(req: Request) {
  // Refuse before buffering the body; +64 KB leaves room for the multipart envelope.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE_BYTES + 64 * 1024) {
    return Response.json({ error: "The file is larger than 5 MB" }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  const parsed = uploadSchema.safeParse({ file: form?.get("file") });
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { file } = parsed.data;

  const text = await extractText(file).catch(() => null);
  if (!text?.trim()) {
    return file.name.toLowerCase().endsWith(".pdf")
      ? Response.json(
          { error: "No extractable text in this PDF (scanned image?)" },
          { status: 422 },
        )
      : Response.json({ error: "The file has no text" }, { status: 400 });
  }

  try {
    return Response.json(await ingestDocument(file.name, text));
  } catch (error) {
    if (error instanceof DocumentTooLongError) {
      return Response.json({ error: error.message }, { status: 413 });
    }
    throw error;
  }
}
