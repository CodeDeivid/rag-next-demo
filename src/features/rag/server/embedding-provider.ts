import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const BATCH_SIZE = 32;

// Outside node_modules so a clean install does not re-download the model.
env.cacheDir = path.join(process.cwd(), ".cache", "models");

// q8 weights: ~4x smaller and faster on CPU, negligible retrieval loss for this model size.
// First call downloads the model into the HF cache; later calls reuse the loaded pipeline (also across HMR).
const globalForEmbedder = globalThis as unknown as {
  embedder?: Promise<FeatureExtractionPipeline>;
};

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  globalForEmbedder.embedder ??= pipeline("feature-extraction", MODEL, { dtype: "q8" }).catch(
    (error) => {
      globalForEmbedder.embedder = undefined; // let the next request retry a failed download
      throw error;
    },
  ) as Promise<FeatureExtractionPipeline>;
  return globalForEmbedder.embedder;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder();
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const output = await embedder(texts.slice(i, i + BATCH_SIZE), {
      pooling: "mean",
      normalize: true,
    });
    vectors.push(...(output.tolist() as number[][]));
  }
  return vectors;
}
