import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentSummary } from "@/features/rag/types";
import type { DocumentErrorCode } from "../types";

type DocumentListProps = {
  documents: DocumentSummary[] | null;
  loadError: DocumentErrorCode | "unknown" | null;
  onRetry: () => void;
  onDelete: (doc: DocumentSummary) => void;
};

export function DocumentList({ documents, loadError, onRetry, onDelete }: DocumentListProps) {
  const t = useTranslations("documents");

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-2">
          {loadError === "unknown" ? t("loadError") : t(`errors.${loadError}`)}
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (documents === null) {
    return (
      <div role="status" aria-label={t("loading")} className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 px-1 py-1.5">
            <Skeleton className="size-4 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto mb-2 size-5" aria-hidden />
        {t("empty")}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5" aria-label={t("listLabel")}>
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors duration-150 hover:bg-muted"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm" title={doc.name}>
              {doc.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t("chunks", { count: doc.chunkCount })}
              {!doc.shared && <> · {<AddedAgo iso={doc.createdAt} />}</>}
            </span>
          </div>
          {doc.shared ? (
            <Badge variant="outline" title={t("exampleTitle")}>
              {t("example")}
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              aria-label={t("delete", { name: doc.name })}
              onClick={() => onDelete(doc)}
            >
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

// Own component so the clock is read only once rows exist (after the client fetch, never at prerender).
function AddedAgo({ iso }: { iso: string }) {
  const t = useTranslations("documents");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  return t("uploaded", { time: format.relativeTime(new Date(iso), now) });
}
