import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { messageText } from "@/features/chat/components/message/message-text";
import { NotFoundCard } from "@/features/chat/components/message/not-found-card";
import { getSources } from "@/features/chat/components/sources-panel";
import { isNotFoundAnswer } from "@/features/chat/markdown/is-not-found-answer";
import { FeedbackButtons } from "@/features/feedback/components/feedback-buttons";
import type { RagUIMessage } from "@/features/rag/types";

type AssistantMessageProps = {
  message: RagUIMessage;
  question: string;
  streaming: boolean;
  /** Another request is running, so actions that start one are disabled. */
  busy: boolean;
  failed: boolean;
  selected: boolean;
  onSelect: () => void;
  onCite: (messageId: string, n: number) => void;
  onShowSources: (messageId: string) => void;
  onRegenerate: () => void;
};

// The markdown renderer is ~150 KB gzipped and only needed once an answer exists.
const AnswerMarkdown = dynamic(
  () => import("@/features/chat/components/answer-markdown").then((m) => m.AnswerMarkdown),
  {
    ssr: false,
    loading: () => <div className="h-5 w-2/3 animate-pulse rounded bg-muted" aria-hidden />,
  },
);

export function AssistantMessage({
  message,
  question,
  streaming,
  busy,
  failed,
  selected,
  onSelect,
  onCite,
  onShowSources,
  onRegenerate,
}: AssistantMessageProps) {
  const t = useTranslations("chat");
  const text = messageText(message);
  const chunks = getSources(message);
  const notFound = !streaming && isNotFoundAnswer(text);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sourcesLabel = chunks ? t("actions.sources", { count: chunks.length }) : "";

  return (
    <div
      // Clicking anywhere selects for mouse users; the sources chip is the keyboard path.
      onClick={onSelect}
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-colors duration-150 sm:px-4",
        selected ? "border-ring/60 bg-card" : "border-transparent hover:bg-muted/40",
      )}
    >
      <span className="sr-only">{t("assistant")} </span>
      {notFound ? (
        <NotFoundCard />
      ) : text ? (
        <AnswerMarkdown
          text={text}
          chunks={chunks ?? []}
          streaming={streaming}
          onCite={(n) => onCite(message.id, n)}
          messageId={message.id}
        />
      ) : streaming ? null : (
        <p className="text-sm text-muted-foreground">
          {failed ? t("noAnswer") : t("stoppedEarly")}
        </p>
      )}

      {!streaming && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-muted-foreground">
          {chunks && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowSources(message.id);
                }}
                className="mr-1 inline-flex h-7 items-center rounded-full border px-2.5 text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden pointer-coarse:min-h-11"
              >
                {sourcesLabel}
              </button>
              <button
                type="button"
                onClick={onSelect}
                aria-pressed={selected}
                className={cn(
                  "mr-1 hidden h-7 items-center rounded-full border px-2.5 text-xs transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:inline-flex",
                  selected && "border-primary/50 bg-highlight text-foreground",
                )}
              >
                {sourcesLabel}
                {selected && <span className="ml-1">· {t("actions.sourcesShown")}</span>}
              </button>
            </>
          )}
          {text && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={copied ? t("actions.copied") : t("actions.copy")}
              onClick={() => void copy()}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          )}
          <span role="status" className="sr-only">
            {copied ? t("actions.copied") : ""}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("actions.regenerate")}
            disabled={busy}
            onClick={onRegenerate}
          >
            <RotateCcw />
          </Button>
          {text && <FeedbackButtons messageId={message.id} question={question} answer={text} />}
        </div>
      )}
    </div>
  );
}
