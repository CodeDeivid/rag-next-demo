import { describe, expect, it } from "vitest";
import { parseSessionId } from "./session-id";

describe("parseSessionId", () => {
  it("lowercases so case variants share one rate-limit key", () => {
    const id = crypto.randomUUID();
    expect(parseSessionId(id.toUpperCase())).toBe(id);
  });

  it("rejects values that are not issued UUIDs, including shapes the old regex accepted", () => {
    expect(parseSessionId(undefined)).toBeNull();
    expect(parseSessionId("hacked")).toBeNull();
    expect(parseSessionId("00000000-0000-0000-0000-000000000001")).toBeNull();
  });
});
