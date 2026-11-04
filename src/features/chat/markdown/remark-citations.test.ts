import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Streamdown, defaultRemarkPlugins } from "streamdown";
import { describe, expect, it } from "vitest";
import { remarkCitations } from "@/features/chat/markdown/remark-citations";

function render(markdown: string) {
  return renderToStaticMarkup(
    createElement(
      Streamdown,
      {
        mode: "static",
        remarkPlugins: [...Object.values(defaultRemarkPlugins), remarkCitations],
        components: {
          a: ({ href, children }) => createElement("cite", { "data-href": href }, children),
        },
      },
      markdown,
    ),
  );
}

describe("remarkCitations", () => {
  it("turns [n] in prose into citation links, keeping the surrounding text", () => {
    const html = render("Vectors are compared by cosine **distance** [1][2].");
    expect(html).toContain('<cite data-href="#cite-1">[1]</cite>');
    expect(html).toContain('<cite data-href="#cite-2">[2]</cite>');
    expect(html).toContain('data-streamdown="strong"');
  });

  it("leaves code untouched", () => {
    const html = render("Use `arr[0]` here.\n\n```\nx[1]\n```");
    expect(html).not.toContain("<cite");
  });
});
