import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "../../api/vocabularyApi";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  createVocabularyAuthSync,
  createVocabularyRealtimeSync,
  createVocabularyStateStore,
  isVocabularySuggestionSaved,
  startVocabularyRealtimeSubscription,
  shouldRefreshActiveVocabulary,
  shouldLoadVocabularyForSession,
  type VocabularyRealtimeClient,
  type VocabularyRealtimeRefreshSchedulerFactory,
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

  it("subscribes to the authenticated user's private realtime vocabulary topic", async () => {
    vi.useFakeTimers();
    const realtime = createFakeRealtimeClient();
    const refresh = vi.fn();

    const subscription = await startVocabularyRealtimeSubscription({
      authState: createAuthenticatedAuthState(),
      client: realtime.client,
      refresh,
    });

    expect(subscription).not.toBeNull();
    expect(realtime.client.realtime.setAuth).toHaveBeenCalledWith(
      "session-token",
    );
    expect(realtime.client.channel).toHaveBeenCalledWith("vocabulary:user_1", {
      config: { private: true },
    });
    const channel = realtime.channels[0];

    expect(channel).toBeDefined();
    expect(channel?.subscribe).toHaveBeenCalledTimes(1);
    expect(channel?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "INSERT" },
      expect.any(Function),
    );
    expect(channel?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "UPDATE" },
      expect.any(Function),
    );
    expect(channel?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "DELETE" },
      expect.any(Function),
    );

    realtime.emit("INSERT");
    realtime.emit("UPDATE");
    realtime.emit("DELETE");
    await vi.advanceTimersByTimeAsync(300);

    expect(refresh).toHaveBeenCalledTimes(1);

    subscription?.unsubscribe();
    vi.useRealTimers();
  });

  it("removes the realtime channel and cancels a pending refresh on unsubscribe", async () => {
    vi.useFakeTimers();
    const realtime = createFakeRealtimeClient();
    const refresh = vi.fn();

    const subscription = await startVocabularyRealtimeSubscription({
      authState: createAuthenticatedAuthState(),
      client: realtime.client,
      refresh,
    });

    realtime.emit("INSERT");
    subscription?.unsubscribe();
    await vi.advanceTimersByTimeAsync(300);

    expect(refresh).not.toHaveBeenCalled();
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );

    vi.useRealTimers();
  });

  it("skips realtime subscription when the user is not authenticated", async () => {
    const realtime = createFakeRealtimeClient();

    await expect(
      startVocabularyRealtimeSubscription({
        authState: {
          accessToken: null,
          session: null,
          status: "anonymous",
        },
        client: realtime.client,
        refresh: vi.fn(),
      }),
    ).resolves.toBeNull();

    expect(realtime.client.channel).not.toHaveBeenCalled();
  });

  it("waits for active realtime channel removal before resubscribing the same topic", async () => {
    const removal = createDeferred<unknown>();
    const realtime = createFakeRealtimeClient({
      removeChannel: () => removal.promise,
    });
    const sync = createVocabularyRealtimeSync({
      getClient: () => realtime.client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState("old-token"));
    await flushPromises();

    expect(realtime.client.channel).toHaveBeenCalledTimes(1);

    sync.sync(createAuthenticatedAuthState("new-token"));
    await flushPromises();

    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channels[0],
    );
    expect(realtime.client.channel).toHaveBeenCalledTimes(1);

    removal.resolve("ok");
    await flushPromises();

    expect(realtime.client.channel).toHaveBeenCalledTimes(2);
    expect(realtime.client.channel).toHaveBeenLastCalledWith(
      "vocabulary:user_1",
      {
        config: { private: true },
      },
    );
    expect(realtime.channels[1]?.subscribe).toHaveBeenCalledTimes(1);
  });

  it("ignores broadcasts from a cleaned-up realtime channel", async () => {
    const realtime = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => realtime.client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();
    sync.cleanup();

    realtime.channels[0]?.emit("INSERT");

    expect(scheduler.schedule).not.toHaveBeenCalled();
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createAuthenticatedAuthState(
  accessToken = "session-token",
): AuthStateSnapshot {
  return {
    accessToken,
    session: {
      access_token: accessToken,
      user: {
        id: "user_1",
      },
    },
    status: "authenticated" as const,
  } as AuthStateSnapshot;
}

function createFakeScheduler() {
  const scheduler = {
    cancel: vi.fn(),
    isScheduled: vi.fn(() => false),
    schedule: vi.fn(),
  };
  let refresh: (() => Promise<void> | void) | undefined;
  const factory: VocabularyRealtimeRefreshSchedulerFactory = (nextRefresh) => {
    refresh = nextRefresh;
    return scheduler;
  };

  return {
    ...scheduler,
    factory,
    get refresh() {
      return refresh;
    },
  };
}

function createFakeRealtimeClient({
  removeChannel = async () => "ok",
}: {
  removeChannel?: VocabularyRealtimeClient["removeChannel"];
} = {}) {
  const channels: FakeRealtimeChannel[] = [];
  const client: VocabularyRealtimeClient = {
    channel: vi.fn((topic, options) => {
      const channel = createFakeRealtimeChannel(topic, options);
      channels.push(channel);
      return channel;
    }),
    realtime: {
      setAuth: vi.fn(async () => undefined),
    },
    removeChannel: vi.fn(removeChannel),
  };

  return {
    get channel() {
      return channels[0];
    },
    channels,
    client,
    emit(event: FakeBroadcastEvent) {
      channels[0]?.emit(event);
    },
  };
}

type FakeBroadcastEvent = "DELETE" | "INSERT" | "UPDATE";
type FakeRealtimeChannel = ReturnType<typeof createFakeRealtimeChannel>;

function createFakeRealtimeChannel(
  topic: string,
  options: { config: { private: true } },
) {
  const handlers = new Map<string, () => void>();
  const channel = {
    emit(event: string) {
      handlers.get(event)?.();
    },
    on: vi.fn(
      (_type: "broadcast", filter: { event: string }, handler: () => void) => {
        handlers.set(filter.event, handler);
        return channel;
      },
    ),
    options,
    subscribe: vi.fn(() => channel),
    topic,
  };

  return channel;
}

function createDeferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}
