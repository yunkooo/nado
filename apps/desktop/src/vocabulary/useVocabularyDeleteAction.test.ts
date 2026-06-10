import { describe, expect, it } from "vitest";
import { shouldApplyVocabularyMutation } from "./useVocabularyDeleteAction";

describe("desktop vocabulary delete action", () => {
  it("applies a mutation only while the triggering access token is still current", () => {
    expect(shouldApplyVocabularyMutation("token-a", "token-a")).toBe(true);
    expect(shouldApplyVocabularyMutation("token-a", "token-b")).toBe(false);
    expect(shouldApplyVocabularyMutation("token-a", null)).toBe(false);
  });
});
