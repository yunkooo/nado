import { describe, expect, it, vi } from "vitest";
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
        deleteMeaning: async () => null,
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
        deleteMeaning: async () => null,
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

  it("deletes one vocabulary meaning for the authenticated user", async () => {
    const deleteMeaning = vi.fn(async () => ({
      item: {
        createdAt: "2026-06-09T00:00:00.000Z",
        id: "row_1",
        meanings: [
          {
            createdAt: "2026-06-09T00:01:00.000Z",
            meaning: "지역 주",
          },
        ],
        term: "state",
        type: "word" as const,
        updatedAt: "2026-06-09T00:02:00.000Z",
      },
      itemDeleted: false as const,
    }));
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        deleteMeaning,
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary/row_1/meanings", {
      body: JSON.stringify({
        createdAt: "2026-06-09T00:00:00.000Z",
        meaning: "상태",
      }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      item: { meanings: [{ meaning: "지역 주" }] },
      itemDeleted: false,
    });
    expect(deleteMeaning).toHaveBeenCalledWith("user_1", "row_1", {
      createdAt: "2026-06-09T00:00:00.000Z",
      meaning: "상태",
    });
  });

  it("rejects an invalid vocabulary meaning deletion request", async () => {
    const deleteMeaning = vi.fn();
    const app = createApp({
      analyzeService: analysisService,
      authService: {
        getUser: async () => ({ id: "user_1" }),
      },
      vocabularyServiceFactory: () => ({
        delete: async () => false,
        deleteMeaning,
        list: async () => ({ items: [], nextCursor: null }),
        save: async () => {
          throw new Error("not used");
        },
      }),
    });

    const response = await request(app, "/api/vocabulary/row_1/meanings", {
      body: JSON.stringify({ meaning: "" }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    expect(deleteMeaning).not.toHaveBeenCalled();
  });

  it("returns not_found when the requested meaning does not exist", async () => {
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

    const response = await request(app, "/api/vocabulary/row_1/meanings", {
      body: JSON.stringify({ meaning: "없는 뜻" }),
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "not_found",
        message: "단어장 뜻을 찾을 수 없습니다.",
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
        deleteMeaning: async () => null,
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
        deleteMeaning: async () => null,
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
