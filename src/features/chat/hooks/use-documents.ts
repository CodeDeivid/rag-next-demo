import { useCallback, useEffect, useRef, useState } from "react";
import { sendUpload } from "@/features/documents/client/send-upload";
import type { DocumentErrorCode, UploadItem } from "@/features/documents/types";
import type { DocumentSummary } from "@/features/rag/types";

export const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt", ".pdf"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function readCode(res: Response): Promise<DocumentErrorCode | "unknown"> {
  const body = (await res.json().catch(() => null)) as { code?: DocumentErrorCode } | null;
  return body?.code ?? "unknown";
}

/** Checked again on the server; this only saves a round trip for obvious mistakes. */
function rejectReason(file: File): DocumentErrorCode | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return "unsupported_type";
  if (file.size > MAX_FILE_BYTES) return "file_too_large";
  if (file.size === 0) return "file_empty";
  return null;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [loadError, setLoadError] = useState<DocumentErrorCode | "unknown" | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  // Files go one after another: parallel uploads would race the same rate limit and quota.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) {
        setLoadError(await readCode(res));
        return;
      }
      const body = (await res.json()) as { documents: DocumentSummary[] };
      setDocuments(body.documents);
      setLoadError(null);
    } catch {
      setLoadError("unknown");
    }
  }, []);

  useEffect(() => {
    // Initial fetch from an external system; the state update happens after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const setStatus = useCallback((id: string, status: UploadItem["status"]) => {
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, status } : u)));
  }, []);

  const enqueue = useCallback(
    (item: UploadItem) => {
      queue.current = queue.current.then(async () => {
        const final = await sendUpload(item.file, {
          onSent: (sent) => setStatus(item.id, { stage: "sending", sent }),
          onEvent: (event) => {
            if (event.stage !== "error" && event.stage !== "done") setStatus(item.id, event);
          },
        });
        setStatus(
          item.id,
          final.stage === "error" ? { stage: "error", code: final.code, retryable: true } : final,
        );
        if (final.stage === "done") await refresh();
      });
    },
    [refresh, setStatus],
  );

  const uploadFiles = useCallback(
    (files: Iterable<File>) => {
      const items = Array.from(files, (file): UploadItem => {
        const code = rejectReason(file);
        return {
          id: crypto.randomUUID(),
          file,
          status: code ? { stage: "error", code, retryable: false } : { stage: "queued" },
        };
      });
      setUploads((list) => [...items, ...list]);
      for (const item of items) if (item.status.stage === "queued") enqueue(item);
    },
    [enqueue],
  );

  const retryUpload = useCallback(
    (id: string) => {
      const item = uploads.find((u) => u.id === id);
      if (!item) return;
      setStatus(id, { stage: "queued" });
      enqueue(item);
    },
    [uploads, enqueue, setStatus],
  );

  const dismissUpload = useCallback((id: string) => {
    setUploads((list) => list.filter((u) => u.id !== id));
  }, []);

  /** Resolves to an error code, or null when the document is gone. */
  const deleteDocument = useCallback(
    async (id: string): Promise<DocumentErrorCode | "unknown" | null> => {
      try {
        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
        // 404 means someone else already deleted it: the list just needs to catch up.
        if (!res.ok && res.status !== 404) return await readCode(res);
        await refresh();
        return null;
      } catch {
        return "unknown";
      }
    },
    [refresh],
  );

  return {
    documents,
    loadError,
    uploads,
    uploadFiles,
    retryUpload,
    dismissUpload,
    refresh,
    deleteDocument,
  };
}
