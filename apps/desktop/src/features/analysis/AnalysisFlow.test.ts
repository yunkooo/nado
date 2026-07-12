import { describe, expect, it } from "vitest";
import { shouldApplyUserScopedMutation } from "@nado/shared/user-scope";
import { markVocabularySuggestionSaving } from "./useVocabularySuggestionSaver";

describe("desktop analysis flow", () => {
  it("keeps other vocabulary suggestions pending when another save starts", () => {
    expect(
      markVocabularySuggestionSaving(
        { "word:wonder:궁금해하다": "saving" },
        "phrase:take a look:살펴보다",
      ),
    ).toEqual({
      "phrase:take a look:살펴보다": "saving",
      "word:wonder:궁금해하다": "saving",
    });
  });

  it("applies vocabulary saves only for the active user", () => {
    expect(shouldApplyUserScopedMutation("user-a", "user-a")).toBe(true);
    expect(shouldApplyUserScopedMutation("user-a", "user-b")).toBe(false);
  });
});
