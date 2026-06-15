import { describe, expect, it } from "vitest";
import {
  shouldApplyVocabularyMutation,
  shouldRemoveVocabularyItemAfterDelete,
} from "./useVocabularyDeleteAction";

describe("desktop vocabulary delete action", () => {
  it("applies a mutation only while the triggering access token is still current", () => {
    expect(shouldApplyVocabularyMutation("token-a", "token-a")).toBe(true);
    expect(shouldApplyVocabularyMutation("token-a", "token-b")).toBe(false);
    expect(shouldApplyVocabularyMutation("token-a", null)).toBe(false);
  });

  it("removes local stale items when the server says they are already gone", () => {
    expect(shouldRemoveVocabularyItemAfterDelete({ status: "success" })).toBe(
      true,
    );
    expect(
      shouldRemoveVocabularyItemAfterDelete({
        message: "단어장 항목을 찾을 수 없습니다.",
        status: "not-found",
      }),
    ).toBe(true);
    expect(
      shouldRemoveVocabularyItemAfterDelete({
        message: "단어장 항목을 삭제하지 못했어요.",
        status: "error",
      }),
    ).toBe(false);
  });
});
