"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { MessageSquareDashed } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { FeedbackSummary } from "@/features/feedback/types";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; data: FeedbackSummary };

/** Feedback of the current session only; the summary route scopes by the session cookie. */
export function QualityDashboard() {
  const t = useTranslations("quality");
  const format = useFormatter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/feedback/summary")
      .then((r) => (r.ok ? (r.json() as Promise<FeedbackSummary>) : Promise.reject()))
      .then((data) => alive && setState({ kind: "ready", data }))
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div aria-busy="true" className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-xl sm:col-span-3" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("error")}</AlertDescription>
      </Alert>
    );
  }

  const { total, positive, negative, latestNegative } = state.data;
  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <MessageSquareDashed className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden />
        <h3 className="font-medium">{t("empty.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("empty.body")}</p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11"
        >
          {t("empty.cta")}
        </Link>
      </div>
    );
  }

  const rate = positive / total;
  const stats = [
    [t("total"), total],
    [t("positive"), positive],
    [t("negative"), negative],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 sm:col-span-3" aria-labelledby="rate">
          <h3 id="rate" className="text-sm text-muted-foreground">
            {t("approval")}
          </h3>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {format.number(rate, { style: "percent" })}
          </p>
          <div
            role="meter"
            aria-label={t("approval")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(rate * 100)}
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${rate * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("approvalOf", { positive, total })}
          </p>
        </section>
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{format.number(value)}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="negatives">
        <h3 id="negatives" className="mb-3 font-medium">
          {t("latestNegative")}
        </h3>
        {latestNegative.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noNegative")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {latestNegative.map((f) => (
              <li key={f.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{f.question}</p>
                  <time dateTime={f.createdAt} className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(f.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <p className="mt-2 line-clamp-3 text-muted-foreground">
                  <span className="sr-only">{t("answer")}: </span>
                  {f.answer}
                </p>
                <p className="mt-2 rounded-md bg-muted px-3 py-2">
                  <span className="font-medium">{t("comment")}: </span>
                  {f.comment ?? <span className="text-muted-foreground">{t("noComment")}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
