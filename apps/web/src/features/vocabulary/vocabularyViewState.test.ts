import { describe, expect, it } from "vitest";
import { getVocabularyPanelState } from "./vocabularyViewState";

describe("getVocabularyPanelState", () => {
  it("separates auth loading from vocabulary loading", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "loading",
        isLoading: false,
        itemCount: 0,
        message: null,
      }),
    ).toBe("auth_loading");

    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        isLoading: true,
        itemCount: 0,
        message: null,
      }),
    ).toBe("loading");
  });

  it("asks anonymous users to log in before showing vocabulary data", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "anonymous",
        isLoading: false,
        itemCount: 3,
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

  it("shows the empty state only after a successful empty response", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        isLoading: false,
        itemCount: 0,
        message: null,
      }),
    ).toBe("empty");
  });
});
