"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Two-option toggle: the active locale is pressed; switching keeps the current page. */
export function LocaleSwitcher() {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("label")} className="flex rounded-lg border p-0.5">
      {routing.locales.map((l) => (
        <Button
          key={l}
          variant={l === locale ? "secondary" : "ghost"}
          size="xs"
          lang={l}
          aria-pressed={l === locale}
          title={t(l)}
          disabled={pending}
          className="uppercase"
          onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
        >
          {l}
        </Button>
      ))}
    </div>
  );
}
