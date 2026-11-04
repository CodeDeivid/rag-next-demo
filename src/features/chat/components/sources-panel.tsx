import { useEffect, useRef } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RagUIMessage, RetrievedChunk } from "@/features/rag/types";

/** Citation n to bring into view; `key` changes on every click so the same n can flash again. */
export type SourceHighlight = { n: number; key: number };

export function getSources(message: RagUIMessage): RetrievedChunk[] | null {
  const part = message.parts.find((p) => p.type === "data-sources");
  return part ? part.data.chunks : null;
}

type SourcesPanelProps = {
  /** The assistant message whose sources are shown, or null before the first answer. */
  message: RagUIMessage | null;
  isLatest: boolean;
  /** The selected answer is still streaming, so its sources may not have arrived yet. */
  pending: boolean;
  highlight: SourceHighlight | null;
};

export function SourcesPanel({ message, isLatest, pending, highlight }: SourcesPanelProps) {
  const chunks = message ? getSources(message) : null;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!highlight) return;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-source="${highlight.n}"]`);
    if (!card) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    // Move focus so keyboard users land on the excerpt they asked for.
    card.focus({ preventScroll: true });
  }, [highlight]);

  return (
    <Card role="region" className="min-h-0" aria-labelledby="sources-title">
      <CardHeader>
        <CardTitle>
          <h2 id="sources-title">Sources</h2>
        </CardTitle>
        <CardDescription aria-live="polite">
          {!message
            ? "Excerpts used for an answer appear here."
            : isLatest
              ? "For the latest answer."
              : "For the selected answer."}
        </CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 overflow-y-auto">
        {!message ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 size-5" aria-hidden />
            Ask a question to see which chunks were retrieved.
          </div>
        ) : chunks === null ? (
          <p className="text-sm text-muted-foreground">
            {pending ? "Searching documents…" : "No sources for this answer."}
          </p>
        ) : chunks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching chunks were found for this question.
          </p>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-3">
            {chunks.map((chunk, i) => {
              const n = i + 1;
              const highlighted = highlight?.n === n;
              return (
                <li
                  // Remount on each citation click so the flash animation replays.
                  key={highlighted ? `${chunk.id}-${highlight.key}` : chunk.id}
                  data-source={n}
                  tabIndex={-1}
                  aria-label={`Source ${n}: ${chunk.documentName}`}
                  className={cn(
                    "scroll-m-2 rounded-lg border p-3 outline-none",
                    highlighted && "ring-2 ring-ring motion-safe:animate-source-flash",
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-mono text-xs font-medium" aria-hidden>
                      [{n}]
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      title={chunk.documentName}
                    >
                      {chunk.documentName}
                    </span>
                    <Badge variant="outline" title="Similarity score (1 − cosine distance)">
                      <span className="sr-only">Score </span>
                      {chunk.score.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="mb-1 text-xs text-muted-foreground">Chunk #{chunk.chunkIndex}</p>
                  <p className="line-clamp-6 text-sm whitespace-pre-line text-muted-foreground">
                    {chunk.content}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
