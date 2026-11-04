import { describe, expect, it } from "vitest";
import { isNotFoundAnswer } from "@/features/chat/markdown/is-not-found-answer";

describe("isNotFoundAnswer", () => {
  it("matches the fixed reply regardless of case, punctuation and spacing", () => {
    expect(isNotFoundAnswer("Não encontrei nos documentos.")).toBe(true);
    expect(isNotFoundAnswer("  NÃO encontrei  nos documentos!\n")).toBe(true);
  });
  it("does not match a real answer that contains the phrase", () => {
    expect(isNotFoundAnswer("Não encontrei nos documentos o valor, mas [1] diz...")).toBe(false);
  });
});
