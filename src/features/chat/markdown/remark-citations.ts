/** Href given to citation links so the `a` renderer can tell them from real links. */
export const CITATION_HREF_PREFIX = "#cite-";

const CITATION = /\[(\d+)\]/g;

// Minimal mdast shape; only text, link and parent nodes are touched.
type MdastNode = { type: string; value?: string; url?: string; children?: MdastNode[] };

function splitCitations(text: string): MdastNode[] {
  const nodes: MdastNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION)) {
    if (match.index > last) nodes.push({ type: "text", value: text.slice(last, match.index) });
    nodes.push({
      type: "link",
      url: `${CITATION_HREF_PREFIX}${match[1]}`,
      children: [{ type: "text", value: match[0] }],
    });
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push({ type: "text", value: text.slice(last) });
  return nodes;
}

function walk(node: MdastNode) {
  // Code nodes have no children, so citations inside code stay literal.
  if (!node.children || node.type === "link" || node.type === "linkReference") return;
  node.children = node.children.flatMap((child) => {
    if (child.type === "text" && child.value) return splitCitations(child.value);
    walk(child);
    return [child];
  });
}

/** Turns "[n]" in prose into links to `#cite-n`, rendered as source chips by the answer view. */
export function remarkCitations() {
  return (tree: MdastNode) => walk(tree);
}
