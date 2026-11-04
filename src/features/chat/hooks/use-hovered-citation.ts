import { useSyncExternalStore } from "react";

type HoveredCitation = { messageId: string; n: number } | null;

// Module store, not context: the chip lives inside Streamdown's memoized renderers and the
// sources panel is a sibling owned by the workspace, so neither can take a new prop.
let hovered: HoveredCitation = null;
const listeners = new Set<() => void>();

export function setHoveredCitation(next: HoveredCitation) {
  if (hovered?.messageId === next?.messageId && hovered?.n === next?.n) return;
  hovered = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Citation number hovered or focused for `messageId`, or null. */
export function useHoveredCitation(messageId: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => (hovered && hovered.messageId === messageId ? hovered.n : null),
    () => null,
  );
}
