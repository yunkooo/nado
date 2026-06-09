import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it } from "vitest";
import {
  createVocabularyStateStore,
  isVocabularySuggestionSaved,
  shouldLoadVocabularyForSession,
} from "./vocabularyState";

const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
  meanings: [
    {
      createdAt: "2026-06-09T00:00:00.000Z",
      meaning: "~한 후에",
    },
  ],
  term: "after",
  type: "phrase",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

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

  it("allows a same-token reload after a vocabulary load error", () => {
    expect(
      shouldLoadVocabularyForSession(
        {
          accessToken: "session-token",
          items: [],
          message: "단어장을 불러오지 못했어요.",
          status: "error",
        },
        "session-token",
      ),
    ).toBe(true);
  });

  it("skips same-token reloads while vocabulary is already loading or ready", () => {
    expect(
      shouldLoadVocabularyForSession(
        {
          accessToken: "session-token",
          items: [],
          message: null,
          status: "loading",
        },
        "session-token",
      ),
    ).toBe(false);

    expect(
      shouldLoadVocabularyForSession(
        {
          accessToken: "session-token",
          items: [vocabularyItem],
          message: null,
          status: "ready",
        },
        "session-token",
      ),
    ).toBe(false);
  });
});
