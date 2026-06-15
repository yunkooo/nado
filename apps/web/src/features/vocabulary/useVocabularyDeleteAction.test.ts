import { describe, expect, it } from "vitest";
import {
  isCurrentVocabularyDeleteRequest,
  shouldRemoveVocabularyItemAfterDelete,
} from "./useVocabularyDeleteAction";

describe("isCurrentVocabularyDeleteRequest", () => {
  it("accepts only the latest delete request for the same access token", () => {
    expect(
      isCurrentVocabularyDeleteRequest(
        {
          accessToken: "session-token",
          requestId: 2,
        },
        {
          accessToken: "session-token",
          requestId: 2,
        },
      ),
    ).toBe(true);

    expect(
      isCurrentVocabularyDeleteRequest(
        {
          accessToken: "old-token",
          requestId: 1,
        },
        {
          accessToken: "new-token",
          requestId: 2,
        },
      ),
    ).toBe(false);
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
