import { useCallback, useEffect, useState } from "react";
import type { DocumentSummary, UploadResult } from "@/features/rag/types";

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "done"; result: UploadResult }
  | { kind: "error"; message: string };

async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ kind: "idle" });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error(await readError(res, "Could not load documents."));
      const body = (await res.json()) as { documents: DocumentSummary[] };
      setDocuments(body.documents);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load documents.");
    }
  }, []);

  useEffect(() => {
    // Initial fetch from an external system; the state update happens after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const uploadFile = useCallback(
    async (file: File) => {
      setUpload({ kind: "uploading", fileName: file.name });
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/documents", { method: "POST", body: form });
        if (!res.ok) throw new Error(await readError(res, "Upload failed."));
        setUpload({ kind: "done", result: (await res.json()) as UploadResult });
        await refresh();
      } catch (err) {
        setUpload({
          kind: "error",
          message: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    },
    [refresh],
  );

  /** Resolves to an error message, or null when the document is gone. */
  const deleteDocument = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
        // 404 means someone else already deleted it: the list just needs to catch up.
        if (!res.ok && res.status !== 404) throw new Error(await readError(res, "Delete failed."));
        await refresh();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "Delete failed.";
      }
    },
    [refresh],
  );

  return { documents, loadError, upload, uploadFile, refresh, deleteDocument };
}
