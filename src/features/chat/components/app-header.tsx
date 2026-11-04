import { BookOpenText, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/features/brand/components/app-logo";
import { LocaleSwitcher } from "@/features/locale/components/locale-switcher";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { Link } from "@/i18n/navigation";

type AppHeaderProps = {
  /** Mobile only: open the documents and sources sheets. */
  onOpenDocuments?: () => void;
  onOpenSources?: () => void;
  hasSources?: boolean;
};

export function AppHeader({ onOpenDocuments, onOpenSources, hasSources }: AppHeaderProps) {
  const t = useTranslations("common");
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b bg-background/80 px-2 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-4">
      {onOpenDocuments && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t("mobile.documents")}
          onClick={onOpenDocuments}
        >
          <FolderOpen />
        </Button>
      )}
      <h1 className="text-base">
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <AppLogo />
        </Link>
      </h1>
      <nav aria-label={t("appName")} className="ml-auto flex items-center gap-1">
        <Link
          href="/quality"
          className="hidden rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:inline"
        >
          {t("nav.quality")}
        </Link>
        <LocaleSwitcher />
        <ThemeToggle />
        {onOpenSources && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t("mobile.sources")}
            disabled={!hasSources}
            onClick={onOpenSources}
          >
            <BookOpenText />
          </Button>
        )}
      </nav>
    </header>
  );
}
