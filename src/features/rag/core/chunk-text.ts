export const CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 150;

/** Splits text into ~size-char chunks with `overlap` chars shared between neighbours.
 *  Prefers breaking on paragraph, then line, then sentence, then whitespace near the end of the window.
 *  Normalises whitespace runs, drops empty chunks, never returns a chunk longer than `size`. */
export function chunkText(
  text: string,
  { size = CHUNK_SIZE, overlap = CHUNK_OVERLAP }: { size?: number; overlap?: number } = {},
): string[] {
  if (size <= 0 || overlap < 0 || overlap >= size) {
    throw new Error("chunkText: overlap must be >= 0 and smaller than size");
  }
  // Keep paragraph breaks and the line breaks Markdown needs (before list items, quotes, code fences,
  // and after headings). Any other single newline is a hard wrap (PDF extraction, 80-column files): join it.
  const clean = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/(?<!^#{1,6} [^\n]*)(?<!\n)\n(?!\n|[-*+>#|] |\d+[.)] |```)/gm, " ")
    .trim();

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) end = start + findCut(clean.slice(start, end), overlap);
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = snapToWordStart(clean, end - overlap, end);
  }
  return chunks;
}

/** Cut position inside the window; always > overlap so the next window moves forward. */
function findCut(window: string, overlap: number): number {
  const min = overlap + 1;
  const paragraph = window.lastIndexOf("\n\n");
  if (paragraph >= min) return paragraph;
  const line = window.lastIndexOf("\n");
  if (line >= min) return line;
  const sentence = [...window.matchAll(/[.!?]\s/g)].at(-1);
  if (sentence && sentence.index + 1 >= min) return sentence.index + 1;
  const space = window.search(/\s\S*$/);
  return space >= min ? space : window.length;
}

/** Avoids starting the overlap in the middle of a word. */
function snapToWordStart(text: string, from: number, limit: number): number {
  if (from <= 0 || /\s/.test(text[from - 1])) return from;
  const space = text.slice(from, limit).search(/\s/);
  return space === -1 ? from : from + space + 1;
}
