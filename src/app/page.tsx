import { RagWorkspace } from "@/features/chat/components/rag-workspace";

// Static shell: all data is fetched client-side, so nothing here blocks prerendering.
export default function Home() {
  return <RagWorkspace />;
}
