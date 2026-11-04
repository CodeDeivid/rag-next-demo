import type { DocumentErrorCode, UploadEvent } from "../types";

/** Splits complete NDJSON lines off `buffer`; the unfinished tail stays for the next read. */
export function readNdjsonLines(buffer: string): { events: UploadEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events = lines.filter((l) => l.trim()).map((l) => JSON.parse(l) as UploadEvent);
  return { events, rest };
}

type Handlers = {
  onSent: (sent: number | null) => void;
  onEvent: (event: UploadEvent) => void;
};

/**
 * XMLHttpRequest instead of fetch: it is the only browser API that reports upload progress,
 * and its `responseText` grows while the NDJSON stream arrives.
 * Resolves with the final event (`done` or `error`).
 */
export function sendUpload(file: File, { onSent, onEvent }: Handlers): Promise<UploadEvent> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let read = 0;
    let rest = "";
    let last: UploadEvent | null = null;
    const fail = (code: DocumentErrorCode): UploadEvent => ({ stage: "error", code, error: "" });

    const drain = () => {
      // Error responses are plain JSON, read once in onload.
      if (xhr.status !== 200) return;
      const chunk = xhr.responseText.slice(read);
      read = xhr.responseText.length;
      const parsed = readNdjsonLines(rest + chunk);
      rest = parsed.rest;
      for (const event of parsed.events) {
        last = event;
        onEvent(event);
      }
    };

    xhr.upload.onprogress = (e) => onSent(e.lengthComputable ? e.loaded / e.total : null);
    xhr.onprogress = drain;
    xhr.onerror = () => resolve(fail("upload_failed"));
    xhr.onload = () => {
      if (xhr.status !== 200) {
        const body = (() => {
          try {
            return JSON.parse(xhr.responseText) as { code?: DocumentErrorCode };
          } catch {
            return null;
          }
        })();
        return resolve(fail(body?.code ?? "upload_failed"));
      }
      drain();
      // A last line without its newline still counts.
      for (const event of readNdjsonLines(`${rest}\n`).events) {
        last = event;
        onEvent(event);
      }
      const final = last as UploadEvent | null;
      resolve(final?.stage === "done" || final?.stage === "error" ? final : fail("upload_failed"));
    };

    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", "/api/documents");
    onSent(0);
    xhr.send(form);
  });
}
