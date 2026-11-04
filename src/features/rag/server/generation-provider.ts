import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, RetryError, StreamProviderError, type LanguageModel } from "ai";
import { RATE_LIMIT_ERROR } from "../types";

/** Our own config error: its message is safe and useful to show in the UI. */
export class GenerationConfigError extends Error {}

/** OpenRouter client shared by generation and embeddings. */
export function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new GenerationConfigError("OPENROUTER_API_KEY must be set in .env (see .env.example)");
  }
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

export function getChatModel(): LanguageModel {
  const modelId = process.env.OPENROUTER_MODEL;
  if (!modelId) {
    throw new GenerationConfigError("OPENROUTER_MODEL must be set in .env (see .env.example)");
  }
  return getOpenRouter()(modelId);
}

function isRateLimit(error: unknown): boolean {
  if (RetryError.isInstance(error)) return isRateLimit(error.lastError);
  return (
    (APICallError.isInstance(error) || StreamProviderError.isInstance(error)) &&
    error.statusCode === 429
  );
}

/** Maps any chat failure to the text the client sees; the real error only goes to the server log. */
export function toChatErrorMessage(error: unknown): string {
  if (isRateLimit(error)) return RATE_LIMIT_ERROR;
  if (error instanceof GenerationConfigError) return error.message;
  console.error("[chat]", error);
  return "Something went wrong while generating the answer.";
}
