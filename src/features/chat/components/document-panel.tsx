import { useId, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { useDocuments } from "@/features/chat/hooks/use-documents";
import type { DocumentSummary } from "@/features/rag/types";

const ACCEPT = ".md,.markdown,.txt,.pdf";

type DocumentPanelProps = ReturnType<typeof useDocuments>;

export function DocumentPanel({
  documents,
  loadError,
  upload,
  uploadFile,
  refresh,
  deleteDocument,
}: DocumentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const uploading = upload.kind === "uploading";

  const [toDelete, setToDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const deletedRef = useRef(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const error = await deleteDocument(toDelete.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    deletedRef.current = true;
    setAnnouncement(`Deleted ${toDelete.name}`);
    setToDelete(null);
  }

  return (
    <Card role="region" className="min-h-0" aria-labelledby="documents-title">
      <CardHeader>
        <CardTitle>
          <h2 id="documents-title">Documents</h2>
        </CardTitle>
        <CardDescription id={hintId}>Markdown, text or PDF, up to 5 MB.</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void refresh()}
            aria-label="Refresh documents"
          >
            <RefreshCw />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so picking the same file again still fires onChange.
            e.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
        <Button
          ref={uploadButtonRef}
          variant="outline"
          disabled={uploading}
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="motion-safe:animate-spin" /> : <Upload />}
          {uploading ? "Indexing…" : "Upload document"}
        </Button>

        <div aria-live="polite" className="empty:hidden">
          {upload.kind === "uploading" && (
            <p className="truncate text-xs text-muted-foreground">Embedding {upload.fileName}…</p>
          )}
          {upload.kind === "done" && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{upload.result.document.name}</span>:{" "}
              {upload.result.chunksInserted} new{" "}
              {upload.result.chunksInserted === 1 ? "chunk" : "chunks"},{" "}
              {upload.result.chunksSkipped} already indexed
            </p>
          )}
          {upload.kind === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{upload.message}</AlertDescription>
            </Alert>
          )}
        </div>

        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : documents === null ? (
          <p className="text-sm text-muted-foreground">Loading documents…</p>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 size-5" aria-hidden />
            No documents yet. Upload one to start asking questions about it.
          </div>
        ) : (
          <ul
            className="flex min-h-0 flex-col gap-1 overflow-y-auto"
            aria-label="Indexed documents"
          >
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate" title={doc.name}>
                  {doc.name}
                </span>
                <Badge variant="secondary" aria-label={`${doc.chunkCount} chunks`}>
                  {doc.chunkCount}
                </Badge>
                {doc.shared ? (
                  <Badge variant="outline" title="Shared example, available to everyone">
                    Example
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${doc.name}`}
                    onClick={() => {
                      deletedRef.current = false;
                      setDeleteError(null);
                      setToDelete(doc);
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </CardContent>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null);
        }}
      >
        <AlertDialogContent
          // The trigger disappears with the deleted row, so send focus somewhere stable.
          finalFocus={() => (deletedRef.current ? uploadButtonRef.current : true)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {toDelete?.chunkCount} {toDelete?.chunkCount === 1 ? "chunk is" : "chunks are"}{" "}
              removed and it stops being used in answers. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting && <Loader2 className="motion-safe:animate-spin" />}
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
