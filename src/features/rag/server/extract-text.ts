import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

// A hostile PDF can be small and still expand into thousands of pages of work.
const MAX_PDF_PAGES = 100;

export async function extractText(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) return file.text();
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  if (pdf.numPages > MAX_PDF_PAGES) throw new Error(`PDF has more than ${MAX_PDF_PAGES} pages`);
  const { text } = await extractPdfText(pdf, { mergePages: true });
  return text;
}
