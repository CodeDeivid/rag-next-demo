import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck, Loader2, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { UploadItem } from "../types";

type UploadRowProps = {
  item: UploadItem;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
};

/** Fraction for the bar, or null for an indeterminate stage. */
function progressOf(status: UploadItem["status"]): number | null {
  switch (status.stage) {
    case "sending":
      return status.sent;
    case "embedding":
      return status.total ? status.done / status.total : null;
    case "done":
      return 1;
    default:
      return null;
  }
}

export function UploadRow({ item, onRetry, onDismiss }: UploadRowProps) {
  const t = useTranslations("documents");
  const { status } = item;
  const name = item.file.name;
  const finished = status.stage === "done" || status.stage === "error";
  const progress = progressOf(status);

  const rowRef = useRef<HTMLDivElement>(null);

  // Finished rows get out of the way; errors stay until dismissed so they can be retried.
  // A row holding keyboard focus waits, so closing it never drops focus on the floor.
  useEffect(() => {
    if (status.stage !== "done") return;
    const timer = setInterval(() => {
      if (!rowRef.current?.contains(document.activeElement)) onDismiss(item.id);
    }, 6000);
    return () => clearInterval(timer);
  }, [status.stage, item.id, onDismiss]);

  const label = (() => {
    switch (status.stage) {
      case "sending":
        return status.sent === null
          ? t("stage.sending")
          : t("stage.sendingPercent", { percent: status.sent });
      case "embedding":
        return t("stage.embeddingCount", { done: status.done, total: status.total });
      case "done":
        return t("stage.done", {
          inserted: status.result.chunksInserted,
          skipped: status.result.chunksSkipped,
        });
      case "error":
        return t(`errors.${status.code}`);
      default:
        return t(`stage.${status.stage}`);
    }
  })();

  return (
    <div
      ref={rowRef}
      className="flex items-start gap-2 rounded-md border border-border bg-background p-2 text-xs"
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {status.stage === "done" ? (
          <CircleCheck className="size-4 text-success" />
        ) : status.stage === "error" ? (
          <CircleAlert className="size-4 text-destructive" />
        ) : (
          <Loader2 className="size-4 text-primary motion-safe:animate-spin" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground" title={name}>
          {name}
        </span>
        <span className={status.stage === "error" ? "text-destructive" : "text-muted-foreground"}>
          {label}
        </span>
        {!finished && (
          <div
            role="progressbar"
            aria-label={t("status", { name, stage: label })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress === null ? undefined : Math.round(progress * 100)}
            className="h-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={
                progress === null
                  ? "h-full w-1/3 rounded-full bg-primary motion-safe:animate-pulse"
                  : "h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
              }
              style={progress === null ? undefined : { width: `${progress * 100}%` }}
            />
          </div>
        )}
        {status.stage === "error" && status.retryable && (
          <Button
            variant="outline"
            size="xs"
            className="self-start"
            aria-label={t("retryFile", { name })}
            onClick={() => onRetry(item.id)}
          >
            <RotateCcw />
            {t("retry")}
          </Button>
        )}
      </div>
      {finished && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={t("dismiss", { name })}
          onClick={() => onDismiss(item.id)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
