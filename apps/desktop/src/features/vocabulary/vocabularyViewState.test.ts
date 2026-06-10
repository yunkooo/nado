import { describe, expect, it } from "vitest";
import { getVocabularyPanelState } from "./vocabularyViewState";

describe("desktop vocabulary view state", () => {
  it("asks anonymous users to log in before showing vocabulary data", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "anonymous",
        itemCount: 0,
        message: null,
        vocabularyStatus: "idle",
      }),
    ).toBe("auth_required");
  });

  it("separates auth loading from vocabulary loading", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "loading",
        itemCount: 0,
        message: null,
        vocabularyStatus: "idle",
      }),
    ).toBe("auth_loading");

    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        itemCount: 0,
        message: null,
        vocabularyStatus: "loading",
      }),
    ).toBe("vocabulary_loading");
  });

  it("keeps the list visible while a saved vocabulary snapshot refreshes", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        itemCount: 2,
        message: null,
        vocabularyStatus: "loading",
      }),
    ).toBe("list");
  });

  it("shows only the connection error when loading vocabulary fails", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        itemCount: 0,
        message: "단어장을 불러오지 못했어요.",
        vocabularyStatus: "error",
      }),
    ).toBe("error");
  });

  it("distinguishes empty and list states for authenticated users", () => {
    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        itemCount: 0,
        message: null,
        vocabularyStatus: "ready",
      }),
    ).toBe("empty");

    expect(
      getVocabularyPanelState({
        authStatus: "authenticated",
        itemCount: 2,
        message: null,
        vocabularyStatus: "ready",
      }),
    ).toBe("list");
  });
});
