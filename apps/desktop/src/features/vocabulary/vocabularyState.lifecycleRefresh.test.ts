import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "../../api/vocabularyApi";
import {
  createVocabularyAuthSync,
  createVocabularyStateStore,
} from "./vocabularyState";
import {
  createAuthenticatedAuthState,
  flushPromises,
  vocabularyItem,
} from "./vocabularyState.testHelpers";

describe("vocabulary state store", () => {
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

  it("skips lifecycle refreshes while the ready vocabulary snapshot is fresh", async () => {
    let currentTime = 1_000;
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      now: () => currentTime,
      store,
    });
    const authState = createAuthenticatedAuthState();

    sync.sync(authState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    await expect(sync.refresh(authState)).resolves.toBe("ignored");

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    currentTime += 60_001;

    await expect(sync.refresh(authState)).resolves.toBe("refreshed");

    expect(listVocabulary).toHaveBeenCalledTimes(2);
  });

  it("refreshes when a fresh token timestamp belongs to a different ready snapshot", async () => {
    let currentTime = 1_000;
    const store = createVocabularyStateStore();
    const firstAccountItem = {
      ...vocabularyItem,
      id: "row_a",
      term: "account-a",
    };
    const secondAccountItem = {
      ...vocabularyItem,
      id: "row_b",
      term: "account-b",
    };
    const listVocabulary = vi.fn(async () => ({
      data: [firstAccountItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      now: () => currentTime,
      store,
    });
    const firstAccountAuthState = createAuthenticatedAuthState("token-a");

    sync.sync(firstAccountAuthState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    store.setReady("token-b", [secondAccountItem]);
    currentTime += 1_000;

    await expect(sync.refresh(firstAccountAuthState)).resolves.toBe(
      "refreshed",
    );

    expect(listVocabulary).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "token-a",
      items: [firstAccountItem],
      status: "ready",
    });
  });

  it("keeps stale lifecycle background refreshes single-flight", async () => {
    let currentTime = 1_000;
    let resolveStaleRefresh: (result: VocabularyListResult) => void = () =>
      undefined;
    const store = createVocabularyStateStore();
    const staleItem = {
      ...vocabularyItem,
      id: "row_stale",
      term: "stale",
    };
    const refreshedItem = {
      ...vocabularyItem,
      id: "row_refreshed",
      term: "refreshed",
    };
    const listVocabulary = vi
      .fn()
      .mockResolvedValueOnce({
        data: [staleItem],
        status: "success" as const,
      })
      .mockImplementationOnce(
        () =>
          new Promise<VocabularyListResult>((resolve) => {
            resolveStaleRefresh = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("duplicate refresh failed"));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      now: () => currentTime,
      store,
    });
    const authState = createAuthenticatedAuthState("session-token");

    sync.sync(authState);
    await flushPromises();
    listVocabulary.mockClear();
    currentTime += 60_001;

    const firstRefresh = sync.refresh(authState);
    const duplicateRefresh = sync.refresh(authState);

    expect(duplicateRefresh).toBe(firstRefresh);
    expect(listVocabulary).toHaveBeenCalledTimes(1);

    resolveStaleRefresh({
      data: [refreshedItem],
      status: "success",
    });

    await expect(firstRefresh).resolves.toBe("refreshed");
    await expect(duplicateRefresh).resolves.toBe("refreshed");
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("forces realtime refreshes even while the ready vocabulary snapshot is fresh", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      listVocabulary,
      now: () => 1_000,
      store,
    });
    const authState = createAuthenticatedAuthState();

    sync.sync(authState);
    await flushPromises();
    listVocabulary.mockClear();

    await expect(sync.refreshAfterCurrentLoad(authState)).resolves.toBe(
      "refreshed",
    );

    expect(listVocabulary).toHaveBeenCalledTimes(1);
  });
});
