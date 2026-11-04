"use client";

import { useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { DocumentPanel } from "@/features/chat/components/document-panel";
import { SourcesPanel, type SourceHighlight } from "@/features/chat/components/sources-panel";
import { useDocuments } from "@/features/chat/hooks/use-documents";
import type { RagUIMessage } from "@/features/rag/types";

/** Owns the chat and document state so the three panels can share it. */
export function RagWorkspace() {
  const docs = useDocuments();
  const chat = useChat<RagUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
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
  }, []);

  const assistants = chat.messages.filter((m) => m.role === "assistant");
  const latest = assistants.at(-1) ?? null;
  const selected = assistants.find((m) => m.id === selectedId) ?? latest;
  const busy = chat.status === "submitted" || chat.status === "streaming";

  return (
    <>
      <a
        href="#question"
        className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium ring-3 ring-ring/50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to chat
      </a>
      <main className="grid w-full flex-1 gap-4 p-4 lg:h-dvh lg:min-h-0 lg:flex-none lg:grid-cols-[16rem_minmax(0,1fr)_20rem] lg:grid-rows-[minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)_26rem]">
        <h1 className="sr-only">RAG Next Demo</h1>
        <DocumentPanel {...docs} />
        <ChatPanel
          chat={chat}
          hasDocuments={docs.documents ? docs.documents.length > 0 : null}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onCite={cite}
        />
        <SourcesPanel
          message={selected}
          isLatest={selected === latest}
          pending={selected === latest && busy}
          highlight={highlight}
        />
      </main>
    </>
  );
}
