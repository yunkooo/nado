import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  createMobileVocabularyRealtimeSync,
  type MobileVocabularyRealtimeClient,
} from "./mobileVocabularyRealtime";

afterEach(() => {
  vi.useRealTimers();
});

describe("mobile vocabulary realtime sync", () => {
  it("awaits realtime auth before subscribing to the private user topic", async () => {
    const setAuth = createDeferred<void>();
    const realtime = createRealtimeClientStub({
      setAuth: () => setAuth.promise,
    });
    const sync = createMobileVocabularyRealtimeSync({
      getClient: () => realtime.client,
      refresh: vi.fn(),
    });

    sync.sync(createAuthenticatedAuthState());
    await flushPromises();

    expect(realtime.client.realtime.setAuth).toHaveBeenCalledWith(
      "session-token",
    );
    expect(realtime.client.channel).not.toHaveBeenCalled();

    setAuth.resolve(undefined);
    await flushPromises();

    expect(realtime.client.channel).toHaveBeenCalledWith("vocabulary:user-id", {
      config: { private: true },
    });
    await sync.cleanup();
  });

  it.each(["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"] as const)(
    "reconnects after %s",
    async (status) => {
      vi.useFakeTimers();
      const realtime = createRealtimeClientStub();
      const sync = createMobileVocabularyRealtimeSync({
        getClient: () => realtime.client,
        refresh: vi.fn(),
        retryMs: 25,
      });

      sync.sync(createAuthenticatedAuthState());
      await flushPromises();
      realtime.channels[0]?.emitStatus(status);
      await flushPromises();

      await vi.advanceTimersByTimeAsync(25);
      await flushPromises();

      expect(realtime.client.channel).toHaveBeenCalledTimes(2);
      await sync.cleanup();
    },
  );

  it("does not subscribe without both a user id and access token", async () => {
    const realtime = createRealtimeClientStub();
    const sync = createMobileVocabularyRealtimeSync({
      getClient: () => realtime.client,
      refresh: vi.fn(),
    });

    sync.sync({
      accessToken: null,
      message: null,
      session: null,
      status: "anonymous",
    });
    await flushPromises();

    expect(realtime.client.realtime.setAuth).not.toHaveBeenCalled();
    expect(realtime.client.channel).not.toHaveBeenCalled();
  });
});

function createAuthenticatedAuthState(): MobileAuthStateSnapshot {
  return {
    accessToken: "session-token",
    message: null,
    session: {
      access_token: "session-token",
      user: { id: "user-id" },
    } as MobileAuthStateSnapshot["session"],
    status: "authenticated",
  };
}

function createRealtimeClientStub({
  setAuth = async () => undefined,
}: {
  setAuth?: MobileVocabularyRealtimeClient["realtime"]["setAuth"];
} = {}) {
  const channels: RealtimeChannelStub[] = [];
  const client: MobileVocabularyRealtimeClient = {
    channel: vi.fn((topic, options) => {
      const channel = createRealtimeChannelStub(topic, options);
      channels.push(channel);
      return channel;
    }),
    realtime: {
      setAuth: vi.fn(setAuth),
    },
    removeChannel: vi.fn(async () => "ok"),
  };

  return { channels, client };
}

type RealtimeChannelStub = ReturnType<typeof createRealtimeChannelStub>;

function createRealtimeChannelStub(
  topic: string,
  options: { config: { private: true } },
) {
  let subscribeHandler:
    | ((
        status: "CHANNEL_ERROR" | "CLOSED" | "SUBSCRIBED" | "TIMED_OUT",
      ) => void)
    | undefined;
  const channel = {
    emitStatus(
      status: "CHANNEL_ERROR" | "CLOSED" | "SUBSCRIBED" | "TIMED_OUT",
    ) {
      subscribeHandler?.(status);
    },
    on: vi.fn(() => channel),
    options,
    subscribe: vi.fn((handler) => {
      subscribeHandler = handler;
      return channel;
    }),
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
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
