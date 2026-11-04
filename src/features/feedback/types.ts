export type FeedbackRating = 1 | -1;

export type FeedbackRequest = {
  messageId: string;
  rating: FeedbackRating;
  comment?: string;
  question: string;
  answer: string;
};

export type NegativeFeedback = {
  id: string;
  question: string;
  answer: string;
  comment: string | null;
  createdAt: string; // ISO
};

/** GET /api/feedback/summary, always scoped to the caller's session. */
export type FeedbackSummary = {
  total: number;
  positive: number;
  negative: number;
  latestNegative: NegativeFeedback[];
};

/** Error body of every feedback route; the client translates by `code`. */
export type ApiError = { error: string; code: string };
