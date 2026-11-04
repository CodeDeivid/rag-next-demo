import { embedMany } from "ai";
import { getOpenRouter } from "./generation-provider";

// Free, multilingual, served by OpenRouter: no native runtime, so it fits a serverless function.
const DEFAULT_MODEL = "nvidia/nemotron-3-embed-1b:free";
const BATCH_SIZE = 32;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = getOpenRouter().embeddingModel(
    process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_MODEL,
  );
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const { embeddings } = await embedMany({
      model,
      values: texts.slice(i, i + BATCH_SIZE),
      maxRetries: 2,
    });
    vectors.push(...embeddings);
  }
  return vectors;
}
