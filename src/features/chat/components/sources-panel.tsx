import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SourceCard } from "@/features/chat/components/sources/source-card";
import { useHoveredCitation } from "@/features/chat/hooks/use-hovered-citation";
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
  /** Pinned by a citation click. */
  highlight: SourceHighlight | null;
  /** Inside a mobile sheet: no card chrome, fills the sheet. */
  bare: boolean;
};

export function SourcesPanel({ message, isLatest, pending, highlight, bare }: SourcesPanelProps) {
  const t = useTranslations("chat.sources");
  const chunks = message ? getSources(message) : null;
  const listRef = useRef<HTMLOListElement>(null);
  const hovered = useHoveredCitation(message?.id ?? null);
  const active = hovered ?? highlight?.n ?? null;

  useEffect(() => {
    if (active === null) return;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-source="${active}"]`);
    if (!card) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [active, highlight?.key]);

  // A click (not a hover) moves focus so keyboard users land on the excerpt they asked for.
  useEffect(() => {
    if (!highlight) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-source="${highlight.n}"]`)
      ?.focus({ preventScroll: true });
  }, [highlight]);

  return (
    <section
      aria-labelledby="sources-title"
      className={cn(
        "flex min-h-0 w-full flex-col",
        bare ? "h-full max-h-[85dvh]" : "rounded-xl border bg-card",
      )}
    >
      {/* In a sheet, the close button sits in the top-right corner: leave it room. */}
      <header className={cn("flex items-baseline gap-2 px-4 pt-4 pb-3", bare && "pr-14")}>
        <h2 id="sources-title" className="text-sm font-medium">
          {t("title")}
        </h2>
        {chunks && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t("count", { count: chunks.length })}
          </span>
        )}
        {message && (
          <span className="ml-auto text-xs text-muted-foreground">
            {isLatest ? t("latest") : t("selected")}
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {!message ? (
          <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 size-5" aria-hidden />
            {t("empty")}
          </div>
        ) : chunks === null ? (
          pending ? (
            <div aria-busy="true" aria-label={t("searching")} className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-3 h-1.5 w-full" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-5/6" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("none")}</p>
          )
        ) : chunks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-3">
            {chunks.map((chunk, i) => (
              <li key={chunk.id}>
                <SourceCard chunk={chunk} n={i + 1} highlighted={active === i + 1} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
