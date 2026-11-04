import type { UploadResult } from "@/features/rag/types";

/** Codes the documents API returns in `{ error, code }`; the UI translates by code. */
export type DocumentErrorCode =
  | "no_session"
  | "rate_limited"
  | "file_missing"
  | "file_empty"
  | "file_too_large"
  | "unsupported_type"
  | "no_text"
  | "pdf_no_text"
  | "document_too_long"
  | "invalid_id"
  | "not_found"
  | "upload_failed";

/** One line of the NDJSON stream POST /api/documents sends back. */
export type UploadEvent =
  | { stage: "received" }
  | { stage: "chunking" }
  | { stage: "embedding"; done: number; total: number }
  | { stage: "saving" }
  | { stage: "done"; result: UploadResult }
  | { stage: "error"; code: DocumentErrorCode; error: string };

/** Client-side state of one file in the upload queue. */
export type UploadItem = {
  id: string;
  file: File;
  /** `sent` is 0..1 while the body is uploading, null when the browser can't tell. */
  status:
    | { stage: "queued" }
    | { stage: "sending"; sent: number | null }
    | Exclude<UploadEvent, { stage: "error" }>
    | { stage: "error"; code: DocumentErrorCode; retryable: boolean };
};
