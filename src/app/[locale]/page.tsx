import { setRequestLocale } from "next-intl/server";
import { RagWorkspace } from "@/features/chat/components/rag-workspace";

export default async function Page({ params }: PageProps<"/[locale]">) {
  setRequestLocale((await params).locale);
  return <RagWorkspace />;
}
