import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";

/** Replaces the model's fixed "not found" reply with something the reader can act on. */
export function NotFoundCard() {
  const t = useTranslations("chat.notFound");
  return (
    <div className="flex gap-3 rounded-xl border border-dashed bg-muted/50 p-3">
      <SearchX className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">{t("title")}</p>
        <p className="mt-0.5 text-muted-foreground">{t("hint")}</p>
      </div>
    </div>
  );
}
