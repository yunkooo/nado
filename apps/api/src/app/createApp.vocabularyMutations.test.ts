import { describe, expect, it } from "vitest";
import { request } from "../../test-utils/httpTestServer.js";
import { analysisService } from "../../test-utils/appTestDoubles.js";
import { createApp } from "./createApp.js";

describe("createApp vocabulary mutations", () => {
  it("saves vocabulary for the authenticated user", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => ({ items: [], nextCursor: null }),
        save: async (userId, request) => ({
          createdAt: "2026-06-09T00:00:00.000Z",
          id: `${userId}:${request.type}`,
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: request.meaning,
              note: "note" in request ? request.note : undefined,
            },
          ],
          term: request.term,
          type: request.type,
          updatedAt: "2026-06-09T00:00:00.000Z",
        }),
      }),
    });

    const response = await request(app, "/api/vocabulary", {
      body: JSON.stringify({
        meaning: "~인지 궁금하다",
        note: "정중한 질문에서 자주 쓰입니다.",
        term: "wonder if",
        type: "phrase",
      }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      item: {
        id: "user_1:phrase",
        term: "wonder if",
        type: "phrase",
      },
    });
  });

  it("rejects oversized vocabulary fields before calling the store", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("save should not be called");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary", {
      body: JSON.stringify({
        meaning: "뜻",
        term: "a".repeat(201),
        type: "word",
      }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_input",
        issues: ["vocabulary.term.too_long"],
        message: "단어장 저장 입력이 올바르지 않습니다.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
  });

  it("deletes vocabulary for the authenticated user", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async (userId, id) => userId === "user_1" && id === "row_1",
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary/row_1", {
      headers: { Authorization: "Bearer valid-token" },
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns not_found when deleting a missing vocabulary item", async () => {
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary/missing", {
      headers: { Authorization: "Bearer valid-token" },
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "단어장 항목을 찾을 수 없습니다.",
        requestId: expect.any(String),
        retryable: false,
      },
    });
  });
});
