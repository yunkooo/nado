import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../auth/authState";
import {
  createVocabularyAuthSync,
  createVocabularyRealtimeSync,
  createVocabularyStateStore,
  isVocabularySuggestionSaved,
  shouldLoadVocabularyForSession,
  type VocabularyRealtimeClient,
  type VocabularyRealtimeRefreshSchedulerFactory,
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

  it("uses the latest Supabase access token before refreshing vocabulary", async () => {
    const store = createVocabularyStateStore();
    const listVocabulary = vi.fn(async () => ({
      data: [vocabularyItem],
      status: "success" as const,
    }));
    const sync = createVocabularyAuthSync({
      getAccessToken: async () => "fresh-token",
      listVocabulary,
      store,
    });

    store.setReady("stale-token", []);
    sync.refresh({
      accessToken: "stale-token",
      session: null,
      status: "authenticated",
    });

    await flushPromises();

    expect(listVocabulary).toHaveBeenCalledWith("fresh-token");
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "fresh-token",
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
});

describe("vocabulary realtime sync", () => {
  it("subscribes to the authenticated user's private vocabulary topic", async () => {
    const { client, channels } = createFakeRealtimeClient();
    const refresh = vi.fn();
    const sync = createVocabularyRealtimeSync({
      getClient: () => client,
      refresh,
    });

    sync.sync(createAuthenticatedAuthState("session-token", "user-id"));
    await flushPromises();

    expect(client.realtime.setAuth).toHaveBeenCalledWith("session-token");
    expect(client.channel).toHaveBeenCalledWith("vocabulary:user-id", {
      config: { private: true },
    });
    expect(channels[0]?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "INSERT" },
      expect.any(Function),
    );
    expect(channels[0]?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "UPDATE" },
      expect.any(Function),
    );
    expect(channels[0]?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "DELETE" },
      expect.any(Function),
    );
    expect(channels[0]?.subscribe).toHaveBeenCalledTimes(1);
  });

  it("schedules a debounced background refresh when a vocabulary broadcast arrives", async () => {
    const { client, channels } = createFakeRealtimeClient();
    const refresh = vi.fn();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => client,
      refresh,
    });
    const authState = createAuthenticatedAuthState("session-token", "user-id");

    sync.sync(authState);
    await flushPromises();
    channels[0]?.emit("INSERT");

    expect(scheduler.schedule).toHaveBeenCalledTimes(1);

    await scheduler.refresh?.();

    expect(refresh).toHaveBeenCalledWith(authState);
  });

  it("returns the forced vocabulary refresh promise to the realtime scheduler", async () => {
    const store = createVocabularyStateStore();
    const request = createDeferred<VocabularyListResult>();
    const listVocabulary = vi.fn(() => request.promise);
    const authSync = createVocabularyAuthSync({
      getAccessToken: async () => "session-token",
      listVocabulary,
      store,
    });
    const { client } = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => client,
      refresh: (authState) => authSync.refreshNow(authState),
    });
    const authState = createAuthenticatedAuthState("session-token", "user-id");
    store.setReady("session-token", [vocabularyItem]);

    sync.sync(authState);
    await flushPromises();

    const refreshPromise = scheduler.refresh?.();

    if (!refreshPromise) {
      throw new Error("Expected realtime refresh to return the load promise.");
    }

    let didSettle = false;
    void refreshPromise.then(() => {
      didSettle = true;
    });

    await flushPromises();

    expect(didSettle).toBe(false);

    request.resolve({
      data: [vocabularyItem],
      status: "success",
    });
    await refreshPromise;

    expect(didSettle).toBe(true);
  });

  it("removes the active realtime channel when the session changes", async () => {
    const { client, channels } = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState("session-token", "user-id"));
    await flushPromises();
    sync.sync({
      accessToken: null,
      session: null,
      status: "anonymous",
    });

    expect(scheduler.cancel).toHaveBeenCalledTimes(1);
    expect(client.removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it("ignores broadcasts from a cleaned-up realtime channel", async () => {
    const { client, channels } = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState("session-token", "user-id"));
    await flushPromises();
    sync.sync({
      accessToken: null,
      session: null,
      status: "anonymous",
    });

    channels[0]?.emit("INSERT");

    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it("waits for active realtime channel removal before resubscribing the same topic", async () => {
    const removal = createDeferred<unknown>();
    const { client, channels } = createFakeRealtimeClient({
      removeChannel: () => removal.promise,
    });
    const sync = createVocabularyRealtimeSync({
      getClient: () => client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState("old-token", "user-id"));
    await flushPromises();

    expect(client.channel).toHaveBeenCalledTimes(1);

    sync.sync(createAuthenticatedAuthState("new-token", "user-id"));
    await flushPromises();

    expect(client.removeChannel).toHaveBeenCalledWith(channels[0]);
    expect(client.channel).toHaveBeenCalledTimes(1);

    removal.resolve("ok");
    await flushPromises();

    expect(client.channel).toHaveBeenCalledTimes(2);
    expect(client.channel).toHaveBeenLastCalledWith("vocabulary:user-id", {
      config: { private: true },
    });
    expect(channels[1]?.subscribe).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe when the authenticated session has no user id", async () => {
    const { client } = createFakeRealtimeClient();
    const sync = createVocabularyRealtimeSync({
      getClient: () => client,
      refresh: vi.fn(),
    });

    sync.sync({
      accessToken: "session-token",
      session: null,
      status: "authenticated",
    });
    await flushPromises();

    expect(client.channel).not.toHaveBeenCalled();
  });
});

function createAuthenticatedAuthState(accessToken: string, userId: string) {
  return {
    accessToken,
    session: {
      user: {
        id: userId,
      },
    } as AuthStateSnapshot["session"],
    status: "authenticated" as const,
  };
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

  return { channels, client };
}

type FakeBroadcastEvent = "DELETE" | "INSERT" | "UPDATE";
type FakeRealtimeChannel = ReturnType<typeof createFakeRealtimeChannel>;

function createFakeRealtimeChannel(
  topic: string,
  options: { config: { private: true } },
) {
  const handlers = new Map<FakeBroadcastEvent, () => void>();
  const channel = {
    emit(event: FakeBroadcastEvent) {
      handlers.get(event)?.();
    },
    on: vi.fn(
      (
        _type: "broadcast",
        filter: { event: FakeBroadcastEvent },
        callback: () => void,
      ) => {
        handlers.set(filter.event, callback);
        return channel;
      },
    ),
    options,
    subscribe: vi.fn(() => channel),
    topic,
  };

  return channel;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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
