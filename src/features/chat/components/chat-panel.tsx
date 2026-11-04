import { useEffect, useRef, useState } from "react";
import type { ChatStatus } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import { AlertCircle, ArrowUp, Loader2, MessageSquare, RotateCcw, Square } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AnswerMarkdown } from "@/features/chat/components/answer-markdown";
import { getSources } from "@/features/chat/components/sources-panel";
import { useChatShortcuts } from "@/features/chat/hooks/use-chat-shortcuts";
import { RATE_LIMIT_ERROR, type RagUIMessage } from "@/features/rag/types";

const BUSY_TEXT = {
  submitted: "Searching documents…",
  streaming: "Writing answer…",
} as const;

/** What the live region says on a status change. Never fed the streamed text itself. */
function announce(from: ChatStatus, to: ChatStatus, stopping: boolean) {
  if (to === "submitted") return "Searching documents";
  if (to === "streaming") return "Writing answer";
  if (to === "ready" && from !== "ready") return stopping ? "Stopped" : "Answer complete";
  // Errors are announced by the role="alert" box, so stay quiet here to avoid a double read.
  return "";
}

function messageText(message: RagUIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

// The server already sanitises error text (generic message or a config hint), so it is safe to show.
function errorText(error: Error, hasPartialAnswer: boolean) {
  if (error.message === RATE_LIMIT_ERROR) {
    return "Free model rate limit reached, wait a minute and try again or switch OPENROUTER_MODEL";
  }
  return hasPartialAnswer ? `${error.message} The partial answer is kept above.` : error.message;
}

type ChatPanelProps = {
  chat: UseChatHelpers<RagUIMessage>;
  hasDocuments: boolean | null;
  selectedId: string | null;
  /** null = follow the latest answer. */
  onSelect: (messageId: string | null) => void;
  onCite: (messageId: string, n: number) => void;
};

export function ChatPanel({ chat, hasDocuments, selectedId, onSelect, onCite }: ChatPanelProps) {
  const { messages, sendMessage, status, stop, error, regenerate } = chat;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const waitingForFirstToken = busy && (last?.role === "user" || (last && !messageText(last)));

  // Track status transitions in render (React's "store previous value" pattern) for the live region.
  const [stopping, setStopping] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);
  const [announcement, setAnnouncement] = useState("");
  if (status !== prevStatus) {
    setPrevStatus(status);
    setAnnouncement(announce(prevStatus, status, stopping));
    if (!busy) setStopping(false);
  }

  function handleStop() {
    setStopping(true);
    void stop();
  }

  const { isMac } = useChatShortcuts({ inputRef, busy, onStop: handleStop });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    onSelect(null);
    void sendMessage({ text });
    setInput("");
  }

  return (
    <Card
      id="chat"
      role="region"
      className="h-[75dvh] min-h-0 lg:h-auto"
      aria-labelledby="chat-title"
    >
      <CardHeader>
        <CardTitle>
          <h2 id="chat-title">Ask your documents</h2>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <MessageSquare className="size-6" aria-hidden />
              {hasDocuments === false ? (
                <p>Upload a document first, then ask a question about it.</p>
              ) : (
                <p>Ask a question. Answers cite the excerpts they come from, like [1].</p>
              )}
            </div>
          ) : (
            <ol className="flex flex-col gap-4" aria-label="Conversation">
              {messages.map((m) => {
                const text = messageText(m);
                if (m.role === "user") {
                  return (
                    <li
                      key={m.id}
                      className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                    >
                      <span className="sr-only">You: </span>
                      {text}
                    </li>
                  );
                }
                const selected = m.id === selectedId;
                const chunks = getSources(m);
                const streaming = busy && m === last;
                return (
                  // Clicking anywhere selects for mouse users; the "sources" button is the keyboard path.
                  <li
                    key={m.id}
                    onClick={() => onSelect(m.id)}
                    className={cn(
                      "max-w-[90%] rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50",
                      selected ? "border-ring bg-muted/50" : "border-border",
                    )}
                  >
                    <span className="sr-only">Assistant: </span>
                    {text ? (
                      <AnswerMarkdown
                        text={text}
                        chunks={chunks ?? []}
                        streaming={streaming}
                        onCite={(n) => onCite(m.id, n)}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {streaming
                          ? "…"
                          : error && m === last
                            ? "No answer."
                            : "Stopped before an answer."}
                      </p>
                    )}
                    {chunks && (
                      <button
                        type="button"
                        onClick={() => onSelect(m.id)}
                        aria-pressed={selected}
                        className="mt-1.5 rounded-sm text-xs text-muted-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {chunks.length} {chunks.length === 1 ? "source" : "sources"}
                        {selected ? " · shown" : " · show"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {waitingForFirstToken && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" aria-hidden>
              <Loader2 className="size-4 motion-safe:animate-spin" />
              {status === "submitted" || status === "streaming" ? BUSY_TEXT[status] : null}
            </p>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle />
              <AlertTitle>Answer interrupted</AlertTitle>
              {/* Full-strength colour: the default /90 dims below 4.5:1 on a light card. */}
              <AlertDescription className="text-destructive">
                {errorText(error, last?.role === "assistant" && !!messageText(last))}
              </AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={() => void regenerate()}>
                  <RotateCcw /> Retry
                </Button>
              </AlertAction>
            </Alert>
          )}
        </div>
      </CardContent>

      <CardFooter className="block">
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="question" className="sr-only">
            Question
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
            placeholder="Ask about your documents…"
            aria-describedby="question-hint"
            aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
            className="max-h-40 min-h-10 resize-none bg-background"
            rows={1}
          />
          {busy ? (
            <Button
              type="button"
              size="icon-lg"
              variant="outline"
              onClick={handleStop}
              aria-label="Stop generating"
              aria-keyshortcuts="Escape"
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-lg"
              disabled={!input.trim()}
              aria-label="Send question"
            >
              <ArrowUp />
            </Button>
          )}
        </form>
        <p id="question-hint" className="mt-1.5 hidden text-xs text-muted-foreground sm:block">
          Enter to send · Shift+Enter new line · Esc to stop · {isMac ? "⌘K" : "Ctrl+K"} focus
        </p>
      </CardFooter>
    </Card>
  );
}
