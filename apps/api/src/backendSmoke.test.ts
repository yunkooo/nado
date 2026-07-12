import { describe, expect, it, vi } from "vitest";
import {
  parseOptionalPositiveInteger,
  runBackendSmoke,
} from "./backendSmoke.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("backend smoke configuration", () => {
  it("parses an optional positive realtime timeout", () => {
    expect(parseOptionalPositiveInteger(undefined)).toBeUndefined();
    expect(parseOptionalPositiveInteger(" 5000 ")).toBe(5_000);
  });

  it.each(["", "0", "-1", "1.5", "5seconds"])(
    "rejects invalid realtime timeout %s",
    (value) => {
      expect(() => parseOptionalPositiveInteger(value)).toThrow(
        "NADO_SMOKE_REALTIME_TIMEOUT_MS must be a positive integer.",
      );
    },
  );
});

describe("runBackendSmoke", () => {
  it("checks API liveness and readiness by default", async () => {
    const requests: string[] = [];

    const result = await runBackendSmoke({
      baseUrl: "http://api.test",
      fetch: async (input) => {
        requests.push(String(input));

        return backendStatusResponse(input);
      },
    });

    expect(requests).toEqual([
      "http://api.test/health",
      "http://api.test/ready",
    ]);
    expect(result.checks).toEqual(["health", "readiness"]);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
  ])(
    "fails realtime smoke when access token is %s",
    async (_label, accessToken) => {
      const fetch = vi.fn();

      await expect(
        runBackendSmoke({
          accessToken,
          baseUrl: "http://api.test",
          fetch,
          realtime: true,
        }),
      ).rejects.toThrow(
        "Realtime smoke requires NADO_SMOKE_ACCESS_TOKEN when NADO_SMOKE_REALTIME=1.",
      );

      expect(fetch).not.toHaveBeenCalled();
    },
  );

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

        if (isBackendStatusRequest(input)) {
          return backendStatusResponse(input);
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
        body: undefined,
        url: "http://api.test/ready",
      },
      {
        body: { text: "I was wondering if you could help me." },
        url: "http://api.test/api/analyze",
      },
    ]);
    expect(result.checks).toEqual(["health", "readiness", "analyze"]);
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
      vocabularyTerm: "nado-smoke-test",
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

        if (isBackendStatusRequest(input)) {
          return backendStatusResponse(input);
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
        authorization: null,
        body: undefined,
        method: "GET",
        url: "http://api.test/ready",
      },
      {
        authorization: "Bearer user-token",
        body: {
          meaning: "스모크 테스트 항목",
          note: "백엔드 smoke 검증 후 삭제됩니다.",
          term: "nado-smoke-test",
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
      "readiness",
      "vocabulary:save",
      "vocabulary:list",
      "vocabulary:delete",
    ]);
  });

  it("uses a unique vocabulary term for each smoke run by default", async () => {
    const savedTerms: string[] = [];
    let itemSequence = 0;

    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isBackendStatusRequest(input)) {
        return backendStatusResponse(input);
      }

      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { term: string };
        const itemId = `smoke-id-${++itemSequence}`;
        savedTerms.push(body.term);

        return jsonResponse({ item: { id: itemId, term: body.term } });
      }

      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return jsonResponse({ items: [{ id: `smoke-id-${itemSequence}` }] });
    };

    await runBackendSmoke({
      accessToken: "user-token",
      baseUrl: "http://api.test",
      fetch,
    });
    await runBackendSmoke({
      accessToken: "user-token",
      baseUrl: "http://api.test",
      fetch,
    });

    expect(savedTerms).toHaveLength(2);
    expect(savedTerms[0]).toMatch(/^nado-smoke-[0-9a-f-]{36}$/);
    expect(savedTerms[1]).toMatch(/^nado-smoke-[0-9a-f-]{36}$/);
    expect(savedTerms[0]).not.toBe(savedTerms[1]);
  });

  it("fails listing when the newly saved item is missing and cleans it up", async () => {
    const deletedIds: string[] = [];

    await expect(
      runBackendSmoke({
        accessToken: "user-token",
        baseUrl: "http://api.test",
        fetch: async (input, init) => {
          if (isBackendStatusRequest(input)) {
            return backendStatusResponse(input);
          }

          if (init?.method === "POST") {
            return jsonResponse({ item: { id: "saved-id" } });
          }

          if (init?.method === "DELETE") {
            deletedIds.push(String(input).split("/").at(-1) ?? "");
            return new Response(null, { status: 204 });
          }

          return jsonResponse({ items: [{ id: "different-id" }] });
        },
      }),
    ).rejects.toThrow(
      "Vocabulary list smoke response did not include saved item saved-id.",
    );
    expect(deletedIds).toEqual(["saved-id"]);
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

        if (isBackendStatusRequest(input)) {
          return backendStatusResponse(input);
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
      "GET",
      "POST",
      "GET",
      "DELETE",
    ]);
    expect(result.checks).toEqual([
      "health",
      "readiness",
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
          if (isBackendStatusRequest(input)) {
            return backendStatusResponse(input);
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
        fetch: async (input) => backendStatusResponse(input),
      }),
    ).rejects.toThrow(
      "Realtime smoke channel vocabulary:user-id was not subscribed within 1ms.",
    );

    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );
  });
});

function isBackendStatusRequest(input: RequestInfo | URL): boolean {
  const url = String(input);

  return url.endsWith("/health") || url.endsWith("/ready");
}

function backendStatusResponse(input: RequestInfo | URL): Response {
  return jsonResponse({
    service: "nado-api",
    status: String(input).endsWith("/ready") ? "ready" : "ok",
  });
}

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
