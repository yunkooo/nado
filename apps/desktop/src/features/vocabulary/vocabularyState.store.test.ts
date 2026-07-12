import { isVocabularySuggestionSaved } from "@nado/shared/vocabulary";
import { describe, expect, it } from "vitest";
import {
  createVocabularyStateStore,
  getVocabularyStateForAuth,
} from "./vocabularyState";
import {
  createAuthenticatedAuthState,
  vocabularyItem,
} from "./vocabularyState.testHelpers";

describe("vocabulary state store", () => {
  it("marks a matching recommendation as saved from vocabulary items", () => {
    expect(
      isVocabularySuggestionSaved([vocabularyItem], {
        meaning: "~한 후에",
        term: "after",
        type: "phrase",
      }),
    ).toBe(true);
  });

  it("treats duplicate suggestion notes as saved when the stored note was cleaned", () => {
    expect(
      isVocabularySuggestionSaved(
        [
          {
            ...vocabularyItem,
            meanings: [{ meaning: "피하다" }],
            term: "avoid",
            type: "word",
          },
        ],
        {
          meaning: "피하다",
          note: "피하다",
          term: "avoid",
          type: "word",
        },
      ),
    ).toBe(true);
  });

  it("adds and removes saved vocabulary items from the shared snapshot", () => {
    const store = createVocabularyStateStore();

    store.setReady("session-token", []);
    store.upsertItem(vocabularyItem);

    expect(
      isVocabularySuggestionSaved(store.getSnapshot().items, {
        meaning: "~한 후에",
        term: "after",
        type: "phrase",
      }),
    ).toBe(true);

    store.removeItem("row_1");

    expect(store.getSnapshot().items).toEqual([]);
  });

  it("hides a vocabulary snapshot that belongs to another auth token", () => {
    expect(
      getVocabularyStateForAuth(
        {
          accessToken: "previous-token",
          items: [vocabularyItem],
          message: null,
          status: "ready",
        },
        createAuthenticatedAuthState("current-token"),
      ),
    ).toEqual({
      accessToken: "current-token",
      items: [],
      message: null,
      status: "loading",
    });
  });

  it("keeps a vocabulary snapshot that belongs to the current auth token", () => {
    const vocabularyState = {
      accessToken: "session-token",
      items: [vocabularyItem],
      message: null,
      status: "ready" as const,
    };

    expect(
      getVocabularyStateForAuth(
        vocabularyState,
        createAuthenticatedAuthState(),
      ),
    ).toBe(vocabularyState);
  });
});
