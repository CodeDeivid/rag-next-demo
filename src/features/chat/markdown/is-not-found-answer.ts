import { NOT_FOUND_ANSWER } from "@/features/rag/types";

const normalize = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const TARGET = normalize(NOT_FOUND_ANSWER);

/** The model's fixed "not in the documents" reply, ignoring case, punctuation and spacing. */
export function isNotFoundAnswer(text: string) {
  return normalize(text) === TARGET;
}
