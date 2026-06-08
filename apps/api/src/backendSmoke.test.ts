import { describe, expect, it } from "vitest";
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
});
