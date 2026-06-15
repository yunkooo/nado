import { describe, expect, it, vi } from "vitest";
import { runBackendSmoke } from "./backendSmoke.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("runBackendSmoke", () => {
  it("checks API health by default", async () => {
    const requests: string[] = [];

    const result = await runBackendSmoke({
      baseUrl: "http://api.test",
      fetch: async (input) => {
        requests.push(String(input));

        return jsonResponse({
          service: "nado-api",
          status: "ok",
        });
      },
    });

    expect(requests).toEqual(["http://api.test/health"]);
    expect(result.checks).toEqual(["health"]);
  });

  it("checks analyze when analyze text is provided", async () => {
    const requests: Array<{ body: unknown; url: string }> = [];

    const result = await runBackendSmoke({
      analyzeText: "I was wondering if you could help me.",
      baseUrl: "http://api.test",
      fetch: async (input, init) => {
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          url: String(input),
        });

        if (String(input).endsWith("/health")) {
          return jsonResponse({
            service: "nado-api",
            status: "ok",
          });
        }

        return jsonResponse({
          result: {
            translation: "도와주실 수 있는지 궁금합니다.",
          },
          status: "analyzable",
        });
      },
    });

    expect(requests).toEqual([
      {
        body: undefined,
        url: "http://api.test/health",
      },
      {
        body: { text: "I was wondering if you could help me." },
        url: "http://api.test/api/analyze",
      },
    ]);
    expect(result.checks).toEqual(["health", "analyze"]);
  });

  it("checks vocabulary save, list, and delete when an access token is provided", async () => {
    const requests: Array<{
      authorization: string | null;
      body: unknown;
      method: string;
      url: string;
    }> = [];

    const result = await runBackendSmoke({
      accessToken: "user-token",
      baseUrl: "http://api.test",
      fetch: async (input, init) => {
        requests.push({
          authorization:
            init?.headers instanceof Headers
              ? init.headers.get("Authorization")
              : null,
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url: String(input),
        });

        if (String(input).endsWith("/health")) {
          return jsonResponse({
            service: "nado-api",
            status: "ok",
          });
        }

        if (init?.method === "POST") {
          return jsonResponse({
            item: {
              id: "smoke-id",
              term: "nado-smoke",
            },
          });
        }

        if (init?.method === "DELETE") {
          return new Response(null, { status: 204 });
        }

        return jsonResponse({
          items: [{ id: "smoke-id" }],
        });
      },
    });

    expect(requests).toEqual([
      {
        authorization: null,
        body: undefined,
        method: "GET",
        url: "http://api.test/health",
      },
      {
        authorization: "Bearer user-token",
        body: {
          meaning: "스모크 테스트 항목",
          note: "백엔드 smoke 검증 후 삭제됩니다.",
          term: "nado-smoke",
          type: "word",
        },
        method: "POST",
        url: "http://api.test/api/vocabulary",
      },
      {
        authorization: "Bearer user-token",
        body: undefined,
        method: "GET",
        url: "http://api.test/api/vocabulary",
      },
      {
        authorization: "Bearer user-token",
        body: undefined,
        method: "DELETE",
        url: "http://api.test/api/vocabulary/smoke-id",
      },
    ]);
    expect(result.checks).toEqual([
      "health",
      "vocabulary:save",
      "vocabulary:list",
      "vocabulary:delete",
    ]);
  });

  it("checks vocabulary realtime broadcasts when realtime smoke is enabled", async () => {
    const realtime = createRealtimeClientStub();
    const requests: Array<{
      method: string;
      url: string;
    }> = [];

    const result = await runBackendSmoke({
      accessToken: "user-token",
      baseUrl: "http://api.test",
      createRealtimeClient: realtime.createClient,
      realtime: true,
      realtimeUserId: "user-id",
      supabaseAnonKey: "anon-key",
      supabaseUrl: "http://supabase.test",
      fetch: async (input, init) => {
        requests.push({
          method: init?.method ?? "GET",
          url: String(input),
        });

        if (String(input).endsWith("/health")) {
          return jsonResponse({
            service: "nado-api",
            status: "ok",
          });
        }

        if (init?.method === "POST") {
          queueMicrotask(() => realtime.emit("INSERT", "smoke-id"));

          return jsonResponse({
            item: {
              id: "smoke-id",
              term: "nado-smoke",
            },
          });
        }

        if (init?.method === "DELETE") {
          queueMicrotask(() => realtime.emit("DELETE", "smoke-id"));

          return new Response(null, { status: 204 });
        }

        return jsonResponse({
          items: [{ id: "smoke-id" }],
        });
      },
    });

    expect(realtime.client.realtime.setAuth).toHaveBeenCalledWith("user-token");
    expect(realtime.client.channel).toHaveBeenCalledWith("vocabulary:user-id", {
      config: { private: true },
    });
    expect(realtime.channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "INSERT" },
      expect.any(Function),
    );
    expect(realtime.channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "UPDATE" },
      expect.any(Function),
    );
    expect(realtime.channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "DELETE" },
      expect.any(Function),
    );
    expect(realtime.channel.subscribe).toHaveBeenCalledTimes(1);
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );
    expect(requests.map((request) => request.method)).toEqual([
      "GET",
      "POST",
      "GET",
      "DELETE",
    ]);
    expect(result.checks).toEqual([
      "health",
      "vocabulary:save",
      "vocabulary:realtime:save",
      "vocabulary:list",
      "vocabulary:delete",
      "vocabulary:realtime:delete",
    ]);
  });

  it("ignores realtime broadcasts for other vocabulary items", async () => {
    const realtime = createRealtimeClientStub();

    await expect(
      runBackendSmoke({
        accessToken: "user-token",
        baseUrl: "http://api.test",
        createRealtimeClient: realtime.createClient,
        realtime: true,
        realtimeTimeoutMs: 1,
        realtimeUserId: "user-id",
        supabaseAnonKey: "anon-key",
        supabaseUrl: "http://supabase.test",
        fetch: async (input, init) => {
          if (String(input).endsWith("/health")) {
            return jsonResponse({
              service: "nado-api",
              status: "ok",
            });
          }

          if (init?.method === "POST") {
            queueMicrotask(() => realtime.emit("INSERT", "other-id"));

            return jsonResponse({
              item: {
                id: "smoke-id",
                term: "nado-smoke",
              },
            });
          }

          if (init?.method === "DELETE") {
            queueMicrotask(() => realtime.emit("DELETE", "other-id"));

            return new Response(null, { status: 204 });
          }

          return jsonResponse({
            items: [{ id: "smoke-id" }],
          });
        },
      }),
    ).rejects.toThrow(
      "Realtime smoke did not receive INSERT or UPDATE for smoke-id within 1ms.",
    );

    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );
  });

  it("removes the realtime channel when subscription times out", async () => {
    const realtime = createRealtimeClientStub({
      subscribe: () => undefined,
    });

    await expect(
      runBackendSmoke({
        accessToken: "user-token",
        baseUrl: "http://api.test",
        createRealtimeClient: realtime.createClient,
        realtime: true,
        realtimeTimeoutMs: 1,
        realtimeUserId: "user-id",
        supabaseAnonKey: "anon-key",
        supabaseUrl: "http://supabase.test",
        fetch: async () =>
          jsonResponse({
            service: "nado-api",
            status: "ok",
          }),
      }),
    ).rejects.toThrow(
      "Realtime smoke channel vocabulary:user-id was not subscribed within 1ms.",
    );

    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );
  });
});

function createRealtimeClientStub({
  subscribe = (callback) => callback?.("SUBSCRIBED"),
}: {
  subscribe?: (callback?: (status: string) => void) => void;
} = {}) {
  const handlers = new Map<string, (payload: unknown) => void>();
  const channel = {
    on: vi.fn(
      (
        type: "broadcast",
        filter: { event: string },
        callback: (payload: unknown) => void,
      ) => {
        handlers.set(`${type}:${filter.event}`, callback);
        return channel;
      },
    ),
    subscribe: vi.fn((callback?: (status: string) => void) => {
      subscribe(callback);
      return channel;
    }),
  };
  const client = {
    channel: vi.fn(() => channel),
    realtime: {
      setAuth: vi.fn(async () => undefined),
    },
    removeChannel: vi.fn(async () => "ok"),
  };

  return {
    channel,
    client,
    createClient: vi.fn(() => client),
    emit(event: string, itemId = "smoke-id") {
      handlers.get(`broadcast:${event}`)?.({
        payload:
          event === "DELETE"
            ? { old_record: { id: itemId } }
            : { record: { id: itemId } },
      });
    },
  };
}
