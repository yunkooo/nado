import { describe, expect, it, vi } from "vitest";
import { createVocabularyStateStore } from "./vocabularyState";

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

  it("advances the ready revision only for authoritative list snapshots", () => {
    const store = createVocabularyStateStore();

    store.upsertItem(item);
    store.removeItem(item.id);
    expect(store.getReadyRevision()).toBe(0);

    store.setReady("token-1", [item]);
    expect(store.getReadyRevision()).toBe(1);

    store.setLoading("token-1");
    store.setReady("token-1", []);
    expect(store.getReadyRevision()).toBe(2);
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
});
