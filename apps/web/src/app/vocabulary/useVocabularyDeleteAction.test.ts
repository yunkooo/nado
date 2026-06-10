import { describe, expect, it } from "vitest";
import { isCurrentVocabularyDeleteRequest } from "./useVocabularyDeleteAction";

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
});
