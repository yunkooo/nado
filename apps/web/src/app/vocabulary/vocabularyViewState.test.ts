import { describe, expect, it } from "vitest";
import { getVocabularyPanelState } from "./vocabularyViewState";

describe("getVocabularyPanelState", () => {
  it("shows only the connection error when loading vocabulary fails", () => {
    expect(
      getVocabularyPanelState({
        isLoading: false,
        itemCount: 0,
        message: "단어장을 불러오지 못했어요.",
      }),
    ).toBe("error");
  });

  it("shows the empty state only after a successful empty response", () => {
    expect(
      getVocabularyPanelState({
        isLoading: false,
        itemCount: 0,
        message: null,
      }),
    ).toBe("empty");
  });
});
