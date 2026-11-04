/** Abuse limits in one place. { limit, windowSeconds } feed consumeRateLimit. */
const MINUTE = 60;
const DAY = 24 * 60 * 60;

export const LIMITS = {
  chatPerSession: { limit: 15, windowSeconds: MINUTE },
  chatPerIp: { limit: 40, windowSeconds: MINUTE },
  uploadPerSession: { limit: 10, windowSeconds: 10 * MINUTE },
  uploadPerIp: { limit: 20, windowSeconds: 10 * MINUTE },
  feedbackPerSession: { limit: 30, windowSeconds: MINUTE },
  feedbackPerIp: { limit: 60, windowSeconds: MINUTE },
  feedbackPerSessionDaily: { limit: 100, windowSeconds: DAY },
  // Everyone shares one free OpenRouter quota: when the demo's daily budget is spent, it says so
  // instead of failing at random.
  chatGlobalDaily: { limit: 600, windowSeconds: DAY },
  embeddingBatchesGlobalDaily: { limit: 600, windowSeconds: DAY },
} as const;

export const UPLOAD_TTL_HOURS = 24;
export const FEEDBACK_TTL_DAYS = 7;
