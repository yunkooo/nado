import { describe, expect, it } from "vitest";
import { getVocabularyPanelState } from "./vocabularyViewState";

describe("desktop vocabulary view state", () => {
  it("asks anonymous users to log in before showing vocabulary data", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "anonymous",
        isLoading: false,
        itemCount: 0,
        message: null,
      }),
    ).toBe("auth_required");
  });

  it("shows only the connection error when loading vocabulary fails", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        isLoading: false,
        itemCount: 0,
        message: "단어장을 불러오지 못했어요.",
      }),
    ).toBe("error");
  });

  it("distinguishes empty and list states for authenticated users", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        isLoading: false,
        itemCount: 0,
        message: null,
      }),
    ).toBe("empty");

    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        isLoading: false,
        itemCount: 2,
        message: null,
      }),
    ).toBe("list");
  });
});
