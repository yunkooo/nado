import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "./vocabularyApi";
import {
  createVocabularyAuthSync,
  createVocabularyStateStore,
} from "./vocabularyState";
import {
  createAuthenticatedAuthState,
  createDeferred,
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
    sync.refresh({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      status: "ready",
    });

    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("reuses an in-flight background refresh for repeated lifecycle events", async () => {
    const store = createVocabularyStateStore();
    const request = createDeferred<VocabularyListResult>();
    const refreshedItem = {
      ...vocabularyItem,
      id: "row_2",
      term: "before",
    };
    const listVocabulary = vi.fn(() => request.promise);
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });
    const authState = createAuthenticatedAuthState("session-token", "user-id");

    store.setReady("session-token", [vocabularyItem]);
    const firstRefresh = sync.refresh(authState);
    const secondRefresh = sync.refresh(authState);

    expect(firstRefresh).toBe(secondRefresh);
    await flushPromises();
    expect(listVocabulary).toHaveBeenCalledTimes(1);

    request.resolve({ data: [refreshedItem], status: "success" });
    await firstRefresh;

    expect(store.getSnapshot()).toMatchObject({
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("skips active surface refreshes while the loaded vocabulary is fresh", async () => {
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
    const authState = {
      accessToken: "session-token",
      session: null,
      status: "authenticated" as const,
    };

    sync.sync(authState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    sync.refresh(authState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    currentTime += 60_001;
    sync.refresh(authState);
    await flushPromises();

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
    const firstAccountAuthState = createAuthenticatedAuthState(
      "token-a",
      "user-a",
    );

    sync.sync(firstAccountAuthState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    store.setReady("token-b", [secondAccountItem]);
    currentTime += 1_000;

    sync.refresh(firstAccountAuthState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "token-a",
      items: [firstAccountItem],
      status: "ready",
    });
  });

  it("forces a background vocabulary refresh for realtime events even when the snapshot is fresh", async () => {
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
    const authState = createAuthenticatedAuthState("session-token", "user-id");

    sync.sync(authState);
    await flushPromises();
    listVocabulary.mockClear();

    sync.refresh(authState);
    await flushPromises();

    expect(listVocabulary).not.toHaveBeenCalled();

    sync.refreshNow(authState);
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("queues a forced vocabulary refresh that arrives while the same token is loading", async () => {
    const store = createVocabularyStateStore();
    const refreshedItem = {
      ...vocabularyItem,
      id: "row_2",
      term: "before",
    };
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
        data: [refreshedItem],
        status: "success" as const,
      });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });
    const authState = createAuthenticatedAuthState("session-token", "user-id");

    sync.sync(authState);
    sync.refreshNow(authState);

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    if (!firstRequest.resolve) {
      throw new Error("Expected the first vocabulary request to start.");
    }

    firstRequest.resolve({
      data: [vocabularyItem],
      status: "success",
    });
    await flushPromises();
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(2);
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
    sync.refresh({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      message: null,
      status: "ready",
    });
  });

  it("reports manual refresh failures while preserving the ready snapshot", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => {
      throw new Error("network lost");
    });
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });

    store.setReady("session-token", [vocabularyItem]);

    await expect(
      sync.refreshNow({
        accessToken: "session-token",
        session: null,
        status: "authenticated",
      }),
    ).resolves.toBe("failed");

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [vocabularyItem],
      message: null,
      status: "ready",
    });
  });
});
