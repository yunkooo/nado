import { describe, expect, it } from "vitest";
import { shouldApplyAnalysisVocabularyMutation } from "./AnalysisFlow";

describe("desktop analysis flow", () => {
  it("applies vocabulary save results only for the current access token", () => {
    expect(shouldApplyAnalysisVocabularyMutation("token-a", "token-a")).toBe(
      true,
    );
    expect(shouldApplyAnalysisVocabularyMutation("token-a", "token-b")).toBe(
      false,
    );
    expect(shouldApplyAnalysisVocabularyMutation("token-a", null)).toBe(false);
  });
});
