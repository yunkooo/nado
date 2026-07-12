import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVocabularyRealtimeController,
  type VocabularyRealtimeChannel,
  type VocabularyRealtimeClient,
  type VocabularyRealtimeSubscribeStatus,
} from "./vocabularyRealtime";

type AuthContext = {
  accessToken: string | null;
  userId: string | null;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("createVocabularyRealtimeController", () => {
  it("waits for realtime auth before creating the private channel", async () => {
    const setAuth = createDeferred<void>();
    const realtime = createFakeRealtimeClient({
      setAuth: () => setAuth.promise,
    });
    const controller = createController(realtime.client);

    controller.sync(createAuthContext());
    await flushPromises();

    expect(realtime.client.realtime.setAuth).toHaveBeenCalledWith(
      "session-token",
    );
    expect(realtime.client.channel).not.toHaveBeenCalled();

    setAuth.resolve(undefined);
    await flushPromises();

    expect(realtime.client.channel).toHaveBeenCalledWith("vocabulary:user-1", {
      config: { private: true },
    });
    await controller.cleanup();
  });

  it("does not create a stale channel when the account changes during setAuth", async () => {
    const firstSetAuth = createDeferred<void>();
    const realtime = createFakeRealtimeClient({
      setAuth: vi
        .fn()
        .mockImplementationOnce(() => firstSetAuth.promise)
        .mockResolvedValueOnce(undefined),
    });
    const controller = createController(realtime.client);

    controller.sync(createAuthContext("old-token", "old-user"));
    await flushPromises();
    controller.sync(createAuthContext("new-token", "new-user"));
    await flushPromises();

    expect(realtime.client.channel).not.toHaveBeenCalled();

    firstSetAuth.resolve(undefined);
    await flushPromises();

    expect(realtime.client.channel).toHaveBeenCalledTimes(1);
    expect(realtime.client.channel).toHaveBeenCalledWith(
      "vocabulary:new-user",
      { config: { private: true } },
    );
    await controller.cleanup();
  });

  it("retries after realtime setAuth rejects", async () => {
    vi.useFakeTimers();
    const realtime = createFakeRealtimeClient({
      setAuth: vi
        .fn()
        .mockRejectedValueOnce(new Error("socket unavailable"))
        .mockResolvedValueOnce(undefined),
    });
    const controller = createController(realtime.client, { retryMs: 25 });

    controller.sync(createAuthContext());
    await flushPromises();

    expect(realtime.client.channel).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(25);
    await flushPromises();

    expect(realtime.client.realtime.setAuth).toHaveBeenCalledTimes(2);
    expect(realtime.client.channel).toHaveBeenCalledTimes(1);
    await controller.cleanup();
  });

  it.each(["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"] as const)(
    "reconnects after %s",
    async (status) => {
      vi.useFakeTimers();
      const realtime = createFakeRealtimeClient();
      const controller = createController(realtime.client, { retryMs: 25 });

      controller.sync(createAuthContext());
      await flushPromises();
      realtime.channels[0]?.emitStatus(status);
      await flushPromises();

      expect(realtime.client.removeChannel).toHaveBeenCalledWith(
        realtime.channels[0],
      );

      await vi.advanceTimersByTimeAsync(25);
      await flushPromises();

      expect(realtime.client.channel).toHaveBeenCalledTimes(2);
      await controller.cleanup();
    },
  );

  it("debounces broadcasts through the provided refresh scheduler", async () => {
    const realtime = createFakeRealtimeClient();
    const refresh = vi.fn();
    const schedule = vi.fn();
    const controller = createVocabularyRealtimeController<AuthContext>({
      createRefreshScheduler: () => ({
        cancel: vi.fn(),
        isScheduled: () => false,
        schedule,
      }),
      getClient: () => realtime.client,
      getConnection,
      refresh,
    });

    const context = createAuthContext();
    controller.sync(context);
    await flushPromises();
    realtime.channels[0]?.emit("INSERT");
    realtime.channels[0]?.emit("UPDATE");
    realtime.channels[0]?.emit("DELETE");

    expect(schedule).toHaveBeenCalledTimes(3);
    await controller.cleanup();
  });
});

function createController(
  client: VocabularyRealtimeClient,
  { retryMs = 2_000 }: { retryMs?: number } = {},
) {
  return createVocabularyRealtimeController<AuthContext>({
    getClient: () => client,
    getConnection,
    refresh: vi.fn(),
    retryMs,
  });
}

function getConnection(context: AuthContext) {
  if (!context.accessToken || !context.userId) {
    return null;
  }

  return {
    accessToken: context.accessToken,
    userId: context.userId,
  };
}

function createAuthContext(
  accessToken = "session-token",
  userId = "user-1",
): AuthContext {
  return { accessToken, userId };
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
    | ((status: VocabularyRealtimeSubscribeStatus) => void)
    | undefined;
  const channel: VocabularyRealtimeChannel & {
    emit(event: string): void;
    emitStatus(status: VocabularyRealtimeSubscribeStatus): void;
    options: { config: { private: true } };
    topic: string;
  } = {
    emit(event) {
      handlers.get(event)?.();
    },
    emitStatus(status) {
      subscribeHandler?.(status);
    },
    on: vi.fn((_type, filter, callback) => {
      handlers.set(filter.event, callback);
      return channel;
    }),
    options,
    subscribe: vi.fn((callback) => {
      subscribeHandler = callback;
      return channel;
    }),
    topic,
  };

  return channel;
}

async function flushPromises() {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
