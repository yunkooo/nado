import { describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  createVocabularyRealtimeSync,
  type VocabularyRealtimeClient,
  type VocabularyRealtimeRefreshSchedulerFactory,
} from "./vocabularyRealtime";

describe("vocabulary realtime sync", () => {
  it("subscribes to the authenticated user's private topic", async () => {
    const realtime = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => realtime.client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();

    expect(realtime.client.realtime.setAuth).toHaveBeenCalledWith(
      "session-token",
    );
    expect(realtime.client.channel).toHaveBeenCalledWith("vocabulary:user_1", {
      config: { private: true },
    });
    expect(realtime.channels[0]?.subscribe).toHaveBeenCalledTimes(1);

    realtime.channels[0]?.emit("INSERT");
    realtime.channels[0]?.emit("UPDATE");
    realtime.channels[0]?.emit("DELETE");

    expect(scheduler.schedule).toHaveBeenCalledTimes(3);
    await sync.cleanup();
  });

  it("waits for active channel removal before resubscribing the same topic", async () => {
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
    expect(realtime.channels[1]?.subscribe).toHaveBeenCalledTimes(1);
  });

  it("ignores broadcasts from a cleaned-up channel", async () => {
    const realtime = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => realtime.client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();
    await sync.cleanup();

    realtime.channels[0]?.emit("INSERT");

    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it("returns the refresh promise to the scheduler", async () => {
    const realtime = createFakeRealtimeClient();
    const scheduler = createFakeScheduler();
    const refreshResult = createDeferred<unknown>();
    const sync = createVocabularyRealtimeSync({
      createRefreshScheduler: scheduler.factory,
      getClient: () => realtime.client,
      refresh: () => refreshResult.promise,
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();

    const scheduledRefresh = scheduler.refresh;
    expect(scheduledRefresh).toBeDefined();

    let didSettle = false;
    const refreshPromise = Promise.resolve(scheduledRefresh?.()).then(() => {
      didSettle = true;
    });

    await flushPromises();
    expect(didSettle).toBe(false);

    refreshResult.resolve("ok");
    await refreshPromise;

    expect(didSettle).toBe(true);
    await sync.cleanup();
  });

  it("retries setup after setAuth fails", async () => {
    vi.useFakeTimers();
    const setAuth = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("socket unavailable"))
      .mockResolvedValue(undefined);
    const realtime = createFakeRealtimeClient({ setAuth });
    const sync = createVocabularyRealtimeSync({
      getClient: () => realtime.client,
      refresh: vi.fn(),
      retryMs: 25,
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();

    expect(setAuth).toHaveBeenCalledTimes(1);
    expect(realtime.client.channel).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(25);
    await flushPromises();

    expect(setAuth).toHaveBeenCalledTimes(2);
    expect(realtime.client.channel).toHaveBeenCalledTimes(1);
    expect(realtime.channels[0]?.subscribe).toHaveBeenCalledTimes(1);

    await sync.cleanup();
    vi.useRealTimers();
  });

  it("removes and recreates a channel after a channel error", async () => {
    vi.useFakeTimers();
    const realtime = createFakeRealtimeClient();
    const sync = createVocabularyRealtimeSync({
      getClient: () => realtime.client,
      refresh: vi.fn(),
      retryMs: 25,
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();

    realtime.channels[0]?.emitStatus("CHANNEL_ERROR");
    await flushPromises();

    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channels[0],
    );

    await vi.advanceTimersByTimeAsync(25);
    await flushPromises();

    expect(realtime.client.channel).toHaveBeenCalledTimes(2);
    expect(realtime.channels[1]?.subscribe).toHaveBeenCalledTimes(1);

    await sync.cleanup();
    vi.useRealTimers();
  });
});

async function flushPromises() {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
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
  setAuth = async () => undefined,
}: {
  removeChannel?: VocabularyRealtimeClient["removeChannel"];
  setAuth?: VocabularyRealtimeClient["realtime"]["setAuth"];
} = {}) {
  const channels: FakeRealtimeChannel[] = [];
  const client: VocabularyRealtimeClient = {
    channel: vi.fn((topic, options) => {
      const channel = createFakeRealtimeChannel(topic, options);
      channels.push(channel);
      return channel;
    }),
    realtime: {
      setAuth: vi.fn(setAuth),
    },
    removeChannel: vi.fn(removeChannel),
  };

  return { channels, client };
}

type FakeRealtimeChannel = ReturnType<typeof createFakeRealtimeChannel>;

function createFakeRealtimeChannel(
  topic: string,
  options: { config: { private: true } },
) {
  const handlers = new Map<string, () => void>();
  let subscribeHandler:
    | ((
        status: "CHANNEL_ERROR" | "CLOSED" | "SUBSCRIBED" | "TIMED_OUT",
      ) => void)
    | undefined;
  const channel = {
    emit(event: string) {
      handlers.get(event)?.();
    },
    emitStatus(
      status: "CHANNEL_ERROR" | "CLOSED" | "SUBSCRIBED" | "TIMED_OUT",
    ) {
      subscribeHandler?.(status);
    },
    on: vi.fn(
      (_type: "broadcast", filter: { event: string }, handler: () => void) => {
        handlers.set(filter.event, handler);
        return channel;
      },
    ),
    options,
    subscribe: vi.fn((handler) => {
      subscribeHandler = handler;
      return channel;
    }),
    topic,
  };

  return channel;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
