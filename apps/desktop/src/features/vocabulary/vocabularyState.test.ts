import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "../../api/vocabularyApi";
import {
  createVocabularyAuthSync,
  createVocabularyStateStore,
  isVocabularySuggestionSaved,
  shouldRefreshActiveVocabulary,
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

  it("ignores stale vocabulary responses after the auth session changes", async () => {
    let resolveListVocabulary: (result: VocabularyListResult) => void = () =>
      undefined;
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(
      () =>
        new Promise<VocabularyListResult>((resolve) => {
          resolveListVocabulary = resolve;
        }),
    );
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    sync.sync({
      accessToken: "old-session-token",
      session: null,
      status: "authenticated",
    });
    sync.sync({
      accessToken: null,
      session: null,
      status: "anonymous",
    });

    resolveListVocabulary({
      data: [vocabularyItem],
      status: "success",
    });
    await flushPromises();

    expect(store.getSnapshot()).toEqual({
      accessToken: null,
      items: [],
      message: null,
      status: "idle",
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

  it("refreshes a ready same-token vocabulary snapshot in the background", async () => {
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
    const resultPromise = sync.refresh({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      status: "ready",
    });

    await expect(resultPromise).resolves.toBe("refreshed");
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("keeps a ready snapshot when a background vocabulary refresh fails", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => {
      throw new Error("network lost");
    });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    store.setReady("session-token", [vocabularyItem]);
    const resultPromise = sync.refresh({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    await expect(resultPromise).resolves.toBe("failed");
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      message: null,
      status: "ready",
    });
  });

  it("skips manual refreshes when the user is not authenticated", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    await expect(
      sync.refresh({
        accessToken: null,
        session: null,
        status: "anonymous",
      }),
    ).resolves.toBe("ignored");
    expect(listVocabulary).not.toHaveBeenCalled();
  });

  it("does not refresh a visible ready vocabulary snapshot before the stale window", () => {
    expect(
      shouldRefreshActiveVocabulary({
        isStudySurfaceActive: true,
        lastRefreshAt: 1_000,
        now: 30_000,
        vocabularyStatus: "ready",
      }),
    ).toBe(false);
  });

  it("refreshes active vocabulary when it is not ready or has become stale", () => {
    expect(
      shouldRefreshActiveVocabulary({
        isStudySurfaceActive: true,
        lastRefreshAt: 1_000,
        now: 30_000,
        vocabularyStatus: "error",
      }),
    ).toBe(true);

    expect(
      shouldRefreshActiveVocabulary({
        isStudySurfaceActive: true,
        lastRefreshAt: 1_000,
        now: 61_000,
        vocabularyStatus: "ready",
      }),
    ).toBe(true);
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
