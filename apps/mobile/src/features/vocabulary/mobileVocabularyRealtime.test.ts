import { describe, expect, it, vi } from "vitest";
import {
  subscribeMobileVocabularyRealtime,
  updateMobileVocabularyRealtimeAuth,
} from "./mobileVocabularyRealtime";

type BroadcastHandler = () => void;

function createRealtimeClientStub() {
  const handlers = new Map<string, BroadcastHandler>();
  const channel = {
    on: vi.fn(
      (
        eventType: string,
        filter: { event: string },
        handler: BroadcastHandler,
      ) => {
        handlers.set(`${eventType}:${filter.event}`, handler);
        return channel;
      },
    ),
    subscribe: vi.fn(() => channel),
  };
  const client = {
    channel: vi.fn(() => channel),
    realtime: {
      setAuth: vi.fn(),
    },
    removeChannel: vi.fn(),
  };

  return { channel, client, handlers };
}

describe("subscribeMobileVocabularyRealtime", () => {
  it("updates realtime auth without creating or removing a channel", () => {
    const { client } = createRealtimeClientStub();

    updateMobileVocabularyRealtimeAuth({
      accessToken: "refreshed-token",
      client,
    });

    expect(client.realtime.setAuth).toHaveBeenCalledWith("refreshed-token");
    expect(client.channel).not.toHaveBeenCalled();
    expect(client.removeChannel).not.toHaveBeenCalled();
  });

  it("subscribes to the user's private vocabulary topic and refreshes on row broadcasts", () => {
    const { channel, client, handlers } = createRealtimeClientStub();
    const refresh = vi.fn();

    const unsubscribe = subscribeMobileVocabularyRealtime({
      accessToken: "session-token",
      client,
      onChange: refresh,
      userId: "user-id",
    });

    expect(client.realtime.setAuth).toHaveBeenCalledWith("session-token");
    expect(client.channel).toHaveBeenCalledWith("vocabulary:user-id", {
      config: { private: true },
    });
    expect(channel.on).toHaveBeenCalledTimes(3);
    expect(channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "INSERT" },
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "UPDATE" },
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "DELETE" },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalledOnce();

    handlers.get("broadcast:INSERT")?.();
    handlers.get("broadcast:DELETE")?.();

    expect(refresh).toHaveBeenCalledTimes(2);

    unsubscribe();

    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("does not subscribe when the session is missing a usable user id or token", () => {
    const { client } = createRealtimeClientStub();

    const unsubscribe = subscribeMobileVocabularyRealtime({
      accessToken: null,
      client,
      onChange: vi.fn(),
      userId: "user-id",
    });

    unsubscribe();

    expect(client.realtime.setAuth).not.toHaveBeenCalled();
    expect(client.channel).not.toHaveBeenCalled();
    expect(client.removeChannel).not.toHaveBeenCalled();
  });
});
