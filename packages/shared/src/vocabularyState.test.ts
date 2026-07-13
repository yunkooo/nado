import { describe, expect, it, vi } from "vitest";
import {
  createVocabularyStateStore,
  removeVocabularyMeaningFromItems,
} from "./vocabularyState";

const item = {
  createdAt: "2026-07-11T00:00:00.000Z",
  id: "item-1",
  meanings: [{ meaning: "뜻" }],
  term: "term",
  type: "word" as const,
  updatedAt: "2026-07-11T00:00:00.000Z",
};

describe("createVocabularyStateStore", () => {
  it("keeps items during a same-session refresh", () => {
    const store = createVocabularyStateStore();
    store.setReady("token-1", [item]);

    store.setLoading("token-1");

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "token-1",
      items: [item],
      status: "loading",
    });
  });

  it("clears items when the session changes", () => {
    const store = createVocabularyStateStore();
    store.setReady("token-1", [item]);

    store.setLoading("token-2");

    expect(store.getSnapshot().items).toEqual([]);
  });

  it("notifies subscribers and supports upsert, removal, and reset", () => {
    const store = createVocabularyStateStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.upsertItem(item);
    store.removeItem(item.id);
    store.reset();
    unsubscribe();
    store.setError("token-1", "error");

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("removes one meaning and removes the card after its last meaning", () => {
    const store = createVocabularyStateStore();
    const itemWithMeanings = {
      ...item,
      meanings: [
        {
          createdAt: "2026-07-11T00:01:00.000Z",
          meaning: "상태",
        },
        {
          createdAt: "2026-07-11T00:02:00.000Z",
          meaning: "지역 주",
        },
      ],
    };
    store.setReady("token-1", [itemWithMeanings]);

    store.removeMeaning(item.id, itemWithMeanings.meanings[0]);

    expect(store.getSnapshot().items).toEqual([
      {
        ...itemWithMeanings,
        meanings: [itemWithMeanings.meanings[1]],
      },
    ]);

    store.removeMeaning(item.id, itemWithMeanings.meanings[1]);

    expect(store.getSnapshot().items).toEqual([]);
  });
});

describe("removeVocabularyMeaningFromItems", () => {
  it("keeps the same collection when the requested meaning is already absent", () => {
    const items = [item];

    expect(
      removeVocabularyMeaningFromItems(items, item.id, {
        meaning: "없는 뜻",
      }),
    ).toBe(items);
  });
});
