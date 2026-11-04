import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { RetrievedChunk } from "@/features/rag/types";

// Below this the excerpt fits in the clamp, so no expand button.
const LONG_EXCERPT = 280;

type SourceCardProps = { chunk: RetrievedChunk; n: number; highlighted: boolean };

export function SourceCard({ chunk, n, highlighted }: SourceCardProps) {
  const t = useTranslations("chat.sources");
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);
  const score = Math.max(0, Math.min(1, chunk.score));
  const long = chunk.content.length > LONG_EXCERPT;

  return (
    <article
      data-source={n}
      tabIndex={-1}
      aria-label={t("card", { n, name: chunk.documentName })}
      className={cn(
        "scroll-m-2 rounded-xl border bg-card p-3 transition-colors duration-150 outline-none",
        highlighted && "bg-highlight ring-2 ring-ring",
      )}
    >
      <header className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium text-primary" aria-hidden>
          [{n}]
        </span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium" title={chunk.documentName}>
          {chunk.documentName}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("chunk", { index: chunk.chunkIndex })}
        </span>
      </header>

      <div className="mt-2 flex items-center gap-2" title={t("similarityHint")}>
        <div
          role="meter"
          aria-label={t("similarity")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(score * 100)}
          aria-valuetext={format.number(score, { style: "percent" })}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${score * 100}%` }} />
        </div>
        <span
          className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums"
          aria-hidden
        >
          {format.number(score, { style: "percent" })}
        </span>
      </div>

      <p
        id={`source-${chunk.id}`}
        className={cn(
          "mt-2 text-sm whitespace-pre-line text-muted-foreground",
          !expanded && "line-clamp-5",
        )}
      >
        {chunk.content}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`source-${chunk.id}`}
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 rounded-sm text-xs font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11"
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      )}
    </article>
  );
}
