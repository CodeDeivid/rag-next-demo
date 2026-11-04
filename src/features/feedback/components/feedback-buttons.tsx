import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FeedbackRating, FeedbackRequest } from "@/features/feedback/types";

type FeedbackButtonsProps = Omit<FeedbackRequest, "rating" | "comment">;

async function postFeedback(body: FeedbackRequest) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/** Thumbs up/down for one answer; thumbs down also asks for an optional comment. */
export function FeedbackButtons(props: FeedbackButtonsProps) {
  const t = useTranslations("chat.feedback");
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const downRef = useRef<HTMLButtonElement>(null);
  const commentId = useId();

  async function send(next: FeedbackRating, text?: string) {
    setRating(next);
    const ok = await postFeedback({ ...props, rating: next, comment: text || undefined });
    setStatus(ok ? "saved" : "error");
  }

  function closeForm() {
    setFormOpen(false);
    downRef.current?.focus();
  }

  return (
    <div className="contents">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={t("up")}
        aria-pressed={rating === 1}
        className={cn(rating === 1 && "text-primary")}
        onClick={() => {
          setFormOpen(false);
          void send(1);
        }}
      >
        <ThumbsUp className={cn(rating === 1 && "fill-current")} />
      </Button>
      <Button
        ref={downRef}
        size="icon-sm"
        variant="ghost"
        aria-label={t("down")}
        aria-pressed={rating === -1}
        aria-expanded={formOpen}
        className={cn(rating === -1 && "text-primary")}
        onClick={() => {
          setFormOpen(true);
          void send(-1, comment);
        }}
      >
        <ThumbsDown className={cn(rating === -1 && "fill-current")} />
      </Button>
      <span role="status" className="text-xs text-muted-foreground">
        {status === "saved" && !formOpen ? t("thanks") : null}
        {status === "error" ? <span className="text-destructive">{t("error")}</span> : null}
      </span>

      {formOpen && (
        <form
          className="mt-2 flex w-full basis-full flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(-1, comment.trim()).then(closeForm);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault(); // keeps the global Esc (stop) shortcut out of it
              closeForm();
            }
          }}
        >
          <label htmlFor={commentId} className="text-xs font-medium">
            {t("commentLabel")}
          </label>
          <Textarea
            id={commentId}
            autoFocus
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            className="min-h-16 bg-background"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={closeForm}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm">
              {t("submit")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
