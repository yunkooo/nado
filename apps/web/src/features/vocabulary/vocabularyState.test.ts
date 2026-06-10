import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it, vi } from "vitest";
import {
  createVocabularyAuthSync,
  createVocabularyStateStore,
  isVocabularySuggestionSaved,
  shouldLoadVocabularyForSession,
} from "./vocabularyState";
import type { VocabularyListResult } from "./vocabularyApi";

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

  it("settles a vocabulary sync request even after the triggering render is gone", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "loading",
    });

    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      status: "ready",
    });
  });

  it("settles thrown vocabulary sync failures as an error state", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => {
      throw new Error("network lost");
    });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [],
      message: "단어장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });

  it("ignores stale vocabulary sync results after a later session starts", async () => {
    const store = createVocabularyStateStore();
    const firstRequest: {
      resolve?: (result: VocabularyListResult) => void;
    } = {};
    const listVocabulary = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<VocabularyListResult>((resolve) => {
            firstRequest.resolve = resolve;
          }),
      )
      .mockResolvedValueOnce({
        data: [
          {
            ...vocabularyItem,
            id: "row_2",
            term: "before",
          },
        ],
        status: "success" as const,
      });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "first-token",
      session: null,
      status: "authenticated",
    });
    sync.sync({
      accessToken: "second-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();
    if (!firstRequest.resolve) {
      throw new Error("Expected the first vocabulary request to start.");
    }

    firstRequest.resolve({
      data: [vocabularyItem],
      status: "success",
    });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "second-token",
      items: [
        expect.objectContaining({
          id: "row_2",
        }),
      ],
      status: "ready",
    });
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

  it("refreshes a ready same-token vocabulary snapshot on demand", async () => {
    const store = createVocabularyStateStore();
    const refreshedItem = {
      ...vocabularyItem,
      id: "row_2",
      term: "before",
    };
    const listVocabulary = vi.fn(async () => ({
      data: [refreshedItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    store.setReady("session-token", [vocabularyItem]);
    sync.refresh({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      status: "loading",
    });

    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
