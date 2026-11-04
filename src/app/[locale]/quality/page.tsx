import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/features/chat/components/app-header";
import { QualityDashboard } from "@/features/feedback/components/quality-dashboard";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/quality">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quality" });
  return { title: t("title") };
}

function QualityContent() {
  const t = useTranslations("quality");
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("description")}</p>
      <QualityDashboard />
    </main>
  );
}

export default async function QualityPage({ params }: PageProps<"/[locale]/quality">) {
  setRequestLocale((await params).locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <QualityContent />
    </div>
  );
}
