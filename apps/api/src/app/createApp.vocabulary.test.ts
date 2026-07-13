import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

describe("createApp vocabulary reads", () => {
  it("rejects vocabulary requests without a bearer token", async () => {
    const app = createApp({ analyzeService: analysisService });

    const response = await request(app, "/api/vocabulary");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_authenticated",
        message: "Google 로그인이 필요합니다.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
  });

  it("returns auth_unavailable when the auth service fails", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => {
          throw new Error("Supabase Auth unavailable");
        },
      },
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "auth_unavailable",
        message: "로그인 세션을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
        requestId: expect.any(String),
        retryable: true,
      },
    });
  });

  it("returns the authenticated user's vocabulary items", async () => {
    const seenTokens: string[] = [];
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async (token) => {
          seenTokens.push(token);

          return { id: "user_1" };
        },
      },
      vocabularyServiceFactory: (token) => {
        seenTokens.push(`factory:${token}`);

        return {
          delete: async () => false,
          deleteMeaning: async () => null,
          list: async (_userId) => ({
            items: [
              {
                createdAt: "2026-06-09T00:00:00.000Z",
                id: "row_1",
                meanings: [
                  {
                    createdAt: "2026-06-09T00:00:00.000Z",
                    meaning: "~인지 궁금하다",
                  },
                ],
                term: "wonder if",
                type: "phrase",
                updatedAt: "2026-06-09T00:00:00.000Z",
              },
            ],
            nextCursor: null,
          }),
          save: async () => {
            throw new Error("not used");
          },
        };
      },
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          createdAt: "2026-06-09T00:00:00.000Z",
          id: "row_1",
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: "~인지 궁금하다",
            },
          ],
          term: "wonder if",
          type: "phrase",
          updatedAt: "2026-06-09T00:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    expect(seenTokens).toEqual(["valid-token", "factory:valid-token"]);
  });

  it("returns an empty vocabulary list for an authenticated user without saved items", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        deleteMeaning: async () => null,
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("rejects oversized vocabulary cursors", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        deleteMeaning: async () => null,
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(
      app,
      `/api/vocabulary?cursor=${"a".repeat(513)}`,
      { headers: { Authorization: "Bearer valid-token" } },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_input",
        message: "단어장 페이지 커서가 올바르지 않습니다.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
  });
});
