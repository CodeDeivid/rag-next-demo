import { useId, useRef, useState } from "react";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as motion from "motion/react-m";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACCEPTED_EXTENSIONS, type useDocuments } from "@/features/chat/hooks/use-documents";
import { DocumentList } from "@/features/documents/components/document-list";
import { UploadRow } from "@/features/documents/components/upload-row";
import type { DocumentErrorCode } from "@/features/documents/types";
import type { DocumentSummary } from "@/features/rag/types";
import { cn } from "cn";

type DocumentPanelProps = ReturnType<typeof useDocuments> & {
  /** Inside the mobile sheet: no card chrome, fill the sheet. */
  bare: boolean;
};

export function DocumentPanel({
  documents,
  loadError,
  uploads,
  uploadFiles,
  retryUpload,
  dismissUpload,
  refresh,
  deleteDocument,
  bare,
}: DocumentPanelProps) {
  const t = useTranslations("documents");
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const titleId = useId();

  const [dragDepth, setDragDepth] = useState(0);
  const [toDelete, setToDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DocumentErrorCode | "unknown" | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const deletedRef = useRef(false);

  const busy = uploads.some((u) => u.status.stage !== "done" && u.status.stage !== "error");
  // Stage names only (no percentages), so screen readers hear each step once.
  const current = uploads.findLast((u) => u.status.stage !== "done" && u.status.stage !== "error");
  const shown = current ?? uploads[0];
  const uploadStatus = shown
    ? t("status", {
        name: shown.file.name,
        stage:
          shown.status.stage === "done"
            ? t("stage.done", {
                inserted: shown.status.result.chunksInserted,
                skipped: shown.status.result.chunksSkipped,
              })
            : shown.status.stage === "error"
              ? t(`errors.${shown.status.code}`)
              : t(`stage.${shown.status.stage}`),
      })
    : "";

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
    setAnnouncement(t("deleted", { name: toDelete.name }));
    setToDelete(null);
  }

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className={cn("relative min-h-0 w-full", bare && "h-full rounded-none bg-transparent ring-0")}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth((d) => d + 1);
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      // Enter/leave fire for every child, so count them instead of toggling.
      onDragLeave={() => setDragDepth((d) => Math.max(0, d - 1))}
      onDrop={(e) => {
        e.preventDefault();
        setDragDepth(0);
        if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
      }}
    >
      {/* The sheet draws its close button in the top-right corner. */}
      <CardHeader className={cn(bare && "pr-14")}>
        <CardTitle>
          <h2 id={titleId}>{t("title")}</h2>
        </CardTitle>
        <CardDescription id={hintId}>{t("hint")}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void refresh()}
            aria-label={t("refresh")}
          >
            <RefreshCw />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            // Reset so picking the same file again still fires onChange.
            e.target.value = "";
            if (files.length) uploadFiles(files);
          }}
        />
        <div
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border p-3 text-center transition-colors duration-150",
            dragDepth > 0 && "border-primary bg-primary/5",
          )}
        >
          <Button
            ref={uploadButtonRef}
            variant="outline"
            className="w-full"
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="motion-safe:animate-spin" /> : <Upload />}
            {t("upload")}
          </Button>
          <span className="text-xs text-muted-foreground" aria-hidden>
            {t("dropHint")}
          </span>
        </div>

        {uploads.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label={t("uploads")}>
            <AnimatePresence initial={false}>
              {uploads.map((item) => (
                <motion.li
                  key={item.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <UploadRow item={item} onRetry={retryUpload} onDismiss={dismissUpload} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <DocumentList
          documents={documents}
          loadError={loadError}
          onRetry={() => void refresh()}
          onDelete={(doc) => {
            deletedRef.current = false;
            setDeleteError(null);
            setToDelete(doc);
          }}
        />

        <p className="sr-only" aria-live="polite">
          {uploadStatus}
        </p>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </CardContent>

      {dragDepth > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/90 text-sm font-medium text-primary"
        >
          <Upload className="mr-2 size-4" />
          {t("dropOverlay")}
        </div>
      )}

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
            <AlertDialogTitle>{t("deleteTitle", { name: toDelete?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { count: toDelete?.chunkCount ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{t(`errors.${deleteError}`)}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting && <Loader2 className="motion-safe:animate-spin" />}
              {deleting ? t("deleting") : t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
