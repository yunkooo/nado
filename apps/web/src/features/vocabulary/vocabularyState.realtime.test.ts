import { describe, expect, it, vi } from "vitest";
import type { VocabularyListResult } from "./vocabularyApi";
import {
  createVocabularyAuthSync,
  createVocabularyRealtimeSync,
  createVocabularyStateStore,
  type VocabularyRealtimeClient,
  type VocabularyRealtimeRefreshSchedulerFactory,
} from "./vocabularyState";
import {
  createAuthenticatedAuthState,
  createDeferred,
  flushPromises,
  vocabularyItem,
} from "./vocabularyState.testHelpers";

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
