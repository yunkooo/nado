import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it } from "vitest";
import {
  createVocabularyStateStore,
  isVocabularySuggestionSaved,
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

  it("removes deleted vocabulary items from the shared snapshot", () => {
    const store = createVocabularyStateStore();

    store.setReady("session-token", [vocabularyItem]);
    store.removeItem("row_1");

    expect(
      isVocabularySuggestionSaved(store.getSnapshot().items, {
        meaning: "~한 후에",
        term: "after",
        type: "phrase",
      }),
    ).toBe(false);
  });

  it("adds saved vocabulary items to the shared snapshot", () => {
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
  });
});
