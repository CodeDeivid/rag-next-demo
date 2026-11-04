import { describe, expect, it } from "vitest";
import { readNdjsonLines } from "./send-upload";

describe("readNdjsonLines", () => {
  it("keeps an unfinished line for the next read", () => {
    const first = readNdjsonLines('{"stage":"received"}\n{"stage":"embed');
    expect(first.events).toEqual([{ stage: "received" }]);
    const second = readNdjsonLines(`${first.rest}ding","done":1,"total":2}\n`);
    expect(second.events).toEqual([{ stage: "embedding", done: 1, total: 2 }]);
    expect(second.rest).toBe("");
  });

  it("ignores blank lines", () => {
    expect(readNdjsonLines('\n{"stage":"saving"}\n\n').events).toEqual([{ stage: "saving" }]);
  });
});
