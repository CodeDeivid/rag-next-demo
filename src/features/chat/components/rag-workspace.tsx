"use client";

import { useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppHeader } from "@/features/chat/components/app-header";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { DocumentPanel } from "@/features/chat/components/document-panel";
import { SourcesPanel, type SourceHighlight } from "@/features/chat/components/sources-panel";
import { useDocuments } from "@/features/chat/hooks/use-documents";
import type { RagUIMessage } from "@/features/rag/types";

/**
 * Owns chat and document state so the panels can share it.
 * Desktop (lg+): documents · chat · sources in three columns.
 * Below lg: the chat fills the screen; documents and sources open as sheets.
 * CSS picks the layout (no JS breakpoint), so server and client render the same thing: no layout shift.
 */
const isDesktop = () => window.matchMedia("(min-width: 64rem)").matches;

export function RagWorkspace() {
  const t = useTranslations("common");
  const docs = useDocuments();
  const chat = useChat<RagUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [docsOpen, setDocsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // null = follow the latest answer; set when the user picks an older one.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<SourceHighlight | null>(null);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setHighlight(null);
  }, []);

  // Stable identity: Streamdown memoizes renderers, so the chip keeps the first callback it saw.
  const cite = useCallback((id: string, n: number) => {
    setSelectedId(id);
    setHighlight((h) => ({ n, key: (h?.key ?? 0) + 1 }));
    if (!isDesktop()) setSourcesOpen(true);
  }, []);

  const showSources = useCallback((id: string) => {
    setSelectedId(id);
    setHighlight(null);
    setSourcesOpen(true);
  }, []);

  const assistants = chat.messages.filter((m) => m.role === "assistant");
  const latest = assistants.at(-1) ?? null;
  const selected = assistants.find((m) => m.id === selectedId) ?? latest;
  const busy = chat.status === "submitted" || chat.status === "streaming";

  const sourcesPanel = (bare: boolean) => (
    <SourcesPanel
      message={selected}
      isLatest={selected === latest}
      pending={selected === latest && busy}
      highlight={highlight}
      bare={bare}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <a
        href="#question"
        className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium ring-3 ring-ring/50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        {t("skipToChat")}
      </a>
      <AppHeader
        onOpenDocuments={() => setDocsOpen(true)}
        onOpenSources={() => setSourcesOpen(true)}
        hasSources={!!selected}
      />
      <main className="grid min-h-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_21rem] lg:gap-4 lg:p-4 2xl:grid-cols-[19rem_minmax(0,1fr)_26rem]">
        <div className="hidden min-h-0 lg:flex">
          <DocumentPanel {...docs} bare={false} />
        </div>
        <ChatPanel
          chat={chat}
          hasDocuments={docs.documents ? docs.documents.length > 0 : null}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onCite={cite}
          onShowSources={showSources}
        />
        <div className="hidden min-h-0 lg:flex">{sourcesPanel(false)}</div>
      </main>

      {/* Sheets mount their content only while open, so these cost nothing on desktop. */}
      <Sheet open={docsOpen} onOpenChange={setDocsOpen}>
        <SheetContent side="left" className="w-[min(22rem,90vw)] gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("mobile.documents")}</SheetTitle>
          </SheetHeader>
          <DocumentPanel {...docs} bare />
        </SheetContent>
      </Sheet>
      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("mobile.sources")}</SheetTitle>
          </SheetHeader>
          {sourcesPanel(true)}
        </SheetContent>
      </Sheet>
    </div>
  );
}
