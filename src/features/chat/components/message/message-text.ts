import type { RagUIMessage } from "@/features/rag/types";

export function messageText(message: RagUIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}
