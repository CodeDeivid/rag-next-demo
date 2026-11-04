import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Streamdown, defaultComponents, defaultRemarkPlugins, type Components } from "streamdown";
import { setHoveredCitation } from "@/features/chat/hooks/use-hovered-citation";
import { CITATION_HREF_PREFIX, remarkCitations } from "@/features/chat/markdown/remark-citations";
import type { RetrievedChunk } from "@/features/rag/types";

const remarkPlugins = [...Object.values(defaultRemarkPlugins), remarkCitations];
const DefaultLink = defaultComponents.a;

type AnswerMarkdownProps = {
  text: string;
  /** Sources of this answer, in citation order ([1] = chunks[0]). */
  chunks: RetrievedChunk[];
  streaming: boolean;
  onCite: (n: number) => void;
  /** Lets hovering a chip highlight its source card. */
  messageId?: string;
};

export function AnswerMarkdown({
  text,
  chunks,
  streaming,
  onCite,
  messageId,
}: AnswerMarkdownProps) {
  const t = useTranslations("chat");
  const components = useMemo<Components>(
    () => ({
      // No remote images: a document or the model could use one to leak data with zero clicks.
      img: ({ alt }) =>
        alt ? <span className="text-muted-foreground">[{t("image", { alt })}]</span> : null,
      a: (props) => {
        const { href, children } = props;
        if (!href?.startsWith(CITATION_HREF_PREFIX)) return <DefaultLink {...props} />;
        const n = Number(href.slice(CITATION_HREF_PREFIX.length));
        const chunk = chunks[n - 1];
        if (!chunk) return <>{children}</>;
        const enter = () => messageId && setHoveredCitation({ messageId, n });
        const leave = () => setHoveredCitation(null);
        return (
          <button
            type="button"
            onClick={() => onCite(n)}
            onPointerEnter={enter}
            onPointerLeave={leave}
            onFocus={enter}
            onBlur={leave}
            aria-label={t("citation", { n, name: chunk.documentName })}
            title={chunk.documentName}
            className="relative mx-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-md border border-border bg-muted px-1 align-[0.1em] font-mono text-[0.7rem] leading-none font-medium text-foreground transition-colors duration-150 outline-none before:absolute before:-inset-3 before:content-[''] not-pointer-coarse:before:hidden hover:border-primary hover:bg-highlight focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {n}
          </button>
        );
      },
    }),
    [chunks, onCite, messageId, t],
  );

  return (
    <Streamdown
      className="text-sm leading-relaxed"
      remarkPlugins={remarkPlugins}
      components={components}
      skipHtml
      isAnimating={streaming}
      caret="block"
    >
      {text}
    </Streamdown>
  );
}
