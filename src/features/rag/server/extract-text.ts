import { extractText as extractPdfText } from "unpdf";

export async function extractText(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) return file.text();
  const { text } = await extractPdfText(new Uint8Array(await file.arrayBuffer()), {
    mergePages: true,
  });
  return text;
}
