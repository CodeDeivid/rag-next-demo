import { useEffect, useRef, useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import * as motion from "motion/react-m";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Loader2,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssistantMessage } from "@/features/chat/components/message/assistant-message";
import { messageText } from "@/features/chat/components/message/message-text";
import { getSources } from "@/features/chat/components/sources-panel";
import { useChatShortcuts } from "@/features/chat/hooks/use-chat-shortcuts";
import { RATE_LIMIT_ERROR, type RagUIMessage } from "@/features/rag/types";

type Phase = "searching" | "writing" | "streaming" | "idle";

// Pixels from the bottom that still count as "at the latest message".
const NEAR_BOTTOM = 80;

/** Error code to message key. The chat route sends JSON `{error, code}` or the rate-limit text. */
function errorKey(error: Error) {
  if (error.message === RATE_LIMIT_ERROR) return "rateLimited";
  try {
    const code = (JSON.parse(error.message) as { code?: string }).code;
    if (code === "no_session") return "noSession";
    if (code === "invalid_input" || code === "empty_question") return "invalidInput";
  } catch {
    // Plain text from the stream: never shown raw.
  }
  return "generic";
}

type ChatPanelProps = {
  chat: UseChatHelpers<RagUIMessage>;
  hasDocuments: boolean | null;
  selectedId: string | null;
  /** null = follow the latest answer. */
  onSelect: (messageId: string | null) => void;
  onCite: (messageId: string, n: number) => void;
  /** Mobile: open the sources sheet for this answer. */
  onShowSources: (messageId: string) => void;
};

export function ChatPanel({
  chat,
  hasDocuments,
  selectedId,
  onSelect,
  onCite,
  onShowSources,
}: ChatPanelProps) {
  const t = useTranslations("chat");
  const reduceMotion = useReducedMotion();
  const { messages, sendMessage, status, stop, error, regenerate } = chat;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);

  const lastAssistant = last?.role === "assistant" ? last : null;
  const phase: Phase = !busy
    ? "idle"
    : !lastAssistant || !getSources(lastAssistant)
      ? "searching"
      : !messageText(lastAssistant)
        ? "writing"
        : "streaming";

  // Announce phase changes only (React's "store previous value" pattern), never the streamed text.
  const [stopping, setStopping] = useState(false);
  const [prevPhase, setPrevPhase] = useState(phase);
  const [announcement, setAnnouncement] = useState("");
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (phase === "searching" || phase === "writing") setAnnouncement(t(`status.${phase}`));
    // Errors are announced by the role="alert" box, so stay quiet then.
    else if (phase === "idle" && !error)
      setAnnouncement(t(stopping ? "status.stopped" : "status.done"));
    if (phase === "idle") setStopping(false);
  }

  function handleStop() {
    setStopping(true);
    void stop();
  }

  const { isMac } = useChatShortcuts({ inputRef, busy, onStop: handleStop });

  // Follow new content only while the reader is at the bottom; scrolling up pauses it.
  const [atBottom, setAtBottom] = useState(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTop = el.scrollHeight;
  }, [messages, status, atBottom]);

  function jumpToLatest() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    setAtBottom(true);
  }

  function send(text: string) {
    if (!text.trim() || busy) return;
    onSelect(null);
    setAtBottom(true);
    void sendMessage({ text: text.trim() });
  }

  function submit() {
    if (!input.trim() || busy) return;
    send(input);
    setInput("");
  }

  const examples = t.raw("empty.examples") as string[];
  const enter = reduceMotion ? false : { opacity: 0, y: 8 };

  return (
    <section
      id="chat"
      aria-labelledby="chat-title"
      className="relative flex min-h-0 flex-col bg-background lg:rounded-xl lg:border lg:bg-card"
    >
      <h2
        id="chat-title"
        className="sr-only lg:not-sr-only lg:px-5 lg:pt-4 lg:text-sm lg:font-medium"
      >
        {t("title")}
      </h2>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM);
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-5"
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col justify-center gap-4 py-6">
            <Sparkles className="size-6 text-primary" aria-hidden />
            <p className="text-lg font-medium text-balance">{t("empty.intro")}</p>
            {hasDocuments === false ? (
              <p className="text-sm text-muted-foreground">{t("empty.noDocuments")}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("empty.preloaded")}</p>
                <ul className="flex flex-col gap-2">
                  {examples.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => send(q)}
                        className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors duration-150 outline-none hover:border-primary/50 hover:bg-highlight focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-4" aria-label={t("conversation")}>
            {messages.map((m, i) => {
              const text = messageText(m);
              return (
                <motion.li
                  key={m.id}
                  initial={enter}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={m.role === "user" ? "ml-auto max-w-[85%]" : "w-full"}
                >
                  {m.role === "user" ? (
                    <p className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                      <span className="sr-only">{t("you")} </span>
                      {text}
                    </p>
                  ) : (
                    <AssistantMessage
                      message={m}
                      question={i > 0 ? messageText(messages[i - 1]) : ""}
                      streaming={busy && m === last}
                      busy={busy}
                      failed={!!error && m === last}
                      selected={m.id === selectedId}
                      onSelect={() => onSelect(m.id)}
                      onCite={onCite}
                      onShowSources={onShowSources}
                      onRegenerate={() => void regenerate({ messageId: m.id })}
                    />
                  )}
                </motion.li>
              );
            })}
          </ol>
        )}

        {(phase === "searching" || phase === "writing") && (
          <p
            className="mx-auto mt-3 flex max-w-3xl items-center gap-2 px-3 text-sm text-muted-foreground sm:px-4"
            aria-hidden
          >
            <Loader2 className="size-4 motion-safe:animate-spin" />
            {t(`status.${phase}`)}
          </p>
        )}

        {error && (
          <Alert variant="destructive" className="mx-auto mt-4 max-w-3xl">
            <AlertCircle />
            <AlertTitle>{t("error.title")}</AlertTitle>
            <AlertDescription>
              {t(`error.${errorKey(error)}`)}
              {lastAssistant && messageText(lastAssistant) ? ` ${t("error.partialKept")}` : ""}
            </AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={() => void regenerate()}>
                <RotateCcw /> {t("error.retry")}
              </Button>
            </AlertAction>
          </Alert>
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={jumpToLatest}
          className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background shadow-float"
        >
          <ArrowDown /> {t("jumpToLatest")}
        </Button>
      )}

      <div className="shrink-0 border-t bg-background/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur lg:rounded-b-xl lg:bg-card lg:px-5">
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        <form
          className="mx-auto flex max-w-3xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="question" className="sr-only">
            {t("composer.label")}
          </label>
          <Textarea
            ref={inputRef}
            id="question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // isComposing: don't send while an IME is still composing a character.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("composer.placeholder")}
            aria-describedby="question-hint"
            aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
            // ~6 lines, then it scrolls.
            className="max-h-38 min-h-11 resize-none bg-background"
            rows={1}
          />
          {busy ? (
            <Button
              type="button"
              size="icon-lg"
              variant="outline"
              className="size-11"
              onClick={handleStop}
              aria-label={t("composer.stop")}
              aria-keyshortcuts="Escape"
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-lg"
              className="size-11"
              disabled={!input.trim()}
              aria-label={t("composer.send")}
            >
              <ArrowUp />
            </Button>
          )}
        </form>
        <p
          id="question-hint"
          className="mx-auto mt-1.5 hidden max-w-3xl text-xs text-muted-foreground sm:block"
        >
          {t("composer.hint", { shortcut: isMac ? "⌘K" : "Ctrl+K" })}
        </p>
      </div>
    </section>
  );
}
