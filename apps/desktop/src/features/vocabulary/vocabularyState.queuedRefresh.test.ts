import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "../../api/vocabularyApi";
import {
  createVocabularyAuthSync,
  createVocabularyStateStore,
  shouldRefreshActiveVocabulary,
} from "./vocabularyState";
import {
  createAuthenticatedAuthState,
  flushPromises,
  vocabularyItem,
} from "./vocabularyState.testHelpers";

describe("vocabulary state store", () => {
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

  it("runs a realtime refresh after the current same-token load settles", async () => {
    let resolveInitialLoad: (result: VocabularyListResult) => void = () =>
      undefined;
    const refreshedItem = {
      ...vocabularyItem,
      id: "row_2",
      term: "afterwards",
    };
    const store = createVocabularyStateStore();
    const listVocabulary = vi
      .fn(
        async (_accessToken: string): Promise<VocabularyListResult> => ({
          data: [refreshedItem],
          status: "success",
        }),
      )
      .mockImplementationOnce(
        (_accessToken: string) =>
          new Promise<VocabularyListResult>((resolve) => {
            resolveInitialLoad = resolve;
          }),
      );
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });
    const authState = {
      accessToken: "session-token",
      session: null,
      status: "authenticated" as const,
    };

    sync.sync(authState);

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "loading",
    });

    const realtimeRefresh = sync.refreshAfterCurrentLoad(authState);

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    resolveInitialLoad({
      data: [vocabularyItem],
      status: "success",
    });
    await flushPromises();

    await expect(realtimeRefresh).resolves.toBe("refreshed");

    expect(listVocabulary).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("returns a queued realtime refresh promise while the same token is loading", async () => {
    let resolveInitialLoad: (result: VocabularyListResult) => void = () =>
      undefined;
    const refreshedItem = {
      ...vocabularyItem,
      id: "row_2",
      term: "afterwards",
    };
    const store = createVocabularyStateStore();
    const listVocabulary = vi
      .fn(
        async (_accessToken: string): Promise<VocabularyListResult> => ({
          data: [refreshedItem],
          status: "success",
        }),
      )
      .mockImplementationOnce(
        (_accessToken: string) =>
          new Promise<VocabularyListResult>((resolve) => {
            resolveInitialLoad = resolve;
          }),
      );
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });
    const authState = createAuthenticatedAuthState();

    sync.sync(authState);

    const realtimeRefresh = sync.refreshAfterCurrentLoad(authState);

    expect(listVocabulary).toHaveBeenCalledTimes(1);

    let didSettle = false;
    void realtimeRefresh.then(() => {
      didSettle = true;
    });

    await flushPromises();
    expect(didSettle).toBe(false);

    resolveInitialLoad({
      data: [vocabularyItem],
      status: "success",
    });

    await realtimeRefresh;

    expect(didSettle).toBe(true);
    expect(listVocabulary).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [refreshedItem],
      status: "ready",
    });
  });

  it("keeps concurrent forced refreshes pending through the latest snapshot", async () => {
    let resolveFirstRefresh: (result: VocabularyListResult) => void = () =>
      undefined;
    let resolveLatestRefresh: (result: VocabularyListResult) => void = () =>
      undefined;
    const staleItem = {
      ...vocabularyItem,
      id: "row_stale",
      term: "stale",
    };
    const latestItem = {
      ...vocabularyItem,
      id: "row_latest",
      term: "latest",
    };
    const store = createVocabularyStateStore();
    const listVocabulary = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<VocabularyListResult>((resolve) => {
            resolveFirstRefresh = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<VocabularyListResult>((resolve) => {
            resolveLatestRefresh = resolve;
          }),
      );
    const sync = createVocabularyAuthSync({
      listVocabulary,
      store,
    });
    const authState = createAuthenticatedAuthState();

    store.setReady("session-token", [vocabularyItem]);

    const firstRefresh = sync.refresh(authState, { force: true });
    const secondRefresh = sync.refresh(authState, { force: true });
    let didSettle = false;
    void firstRefresh.then(() => {
      didSettle = true;
    });

    expect(secondRefresh).toBe(firstRefresh);
    expect(listVocabulary).toHaveBeenCalledTimes(1);

    resolveFirstRefresh({ data: [staleItem], status: "success" });
    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledTimes(2);
    expect(didSettle).toBe(false);

    resolveLatestRefresh({ data: [latestItem], status: "success" });

    await expect(firstRefresh).resolves.toBe("refreshed");
    await expect(secondRefresh).resolves.toBe("refreshed");
    expect(didSettle).toBe(true);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      items: [latestItem],
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
