import { useEffect, useSyncExternalStore, type RefObject } from "react";

const noSubscribe = () => () => {};

/** Mac uses ⌘ for app shortcuts, everything else Ctrl. Server render assumes Ctrl. */
export function useIsMac() {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => false,
  );
}

type ChatShortcuts = {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  busy: boolean;
  onStop: () => void;
};

/** Esc stops a running answer; Ctrl/⌘+K focuses the question box. */
export function useChatShortcuts({ inputRef, busy, onStop }: ChatShortcuts) {
  const isMac = useIsMac();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.target instanceof HTMLInputElement && e.target.type === "file") return;

      const anyModifier = e.altKey || e.shiftKey || e.ctrlKey || e.metaKey;
      if (e.key === "Escape" && !anyModifier && busy) {
        e.preventDefault();
        onStop();
        return;
      }

      // Only the exact combo: Ctrl+Shift+K or ⌘+Ctrl+K mean other things.
      const primary = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
      if (primary && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inputRef, busy, onStop, isMac]);

  return { isMac };
}
