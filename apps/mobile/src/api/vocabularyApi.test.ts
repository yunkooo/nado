import { describe, expect, it, vi } from "vitest";
import {
  deleteVocabularyMeaning,
  listVocabulary,
  saveVocabularyItem,
} from "./vocabularyApi";

describe("listVocabulary", () => {
  it("loads authenticated vocabulary items from the mobile API", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        items: [
          {
            createdAt: "2026-06-09T00:00:00.000Z",
            id: "item-1",
            meanings: [
              {
                createdAt: "2026-06-09T00:00:00.000Z",
                meaning: "궁금해하다",
                note: "정중하게 질문을 꺼내는 표현",
              },
            ],
            term: "wondering",
            type: "word",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
        ],
      }),
    );

    await expect(
      listVocabulary("access-token", {
        apiBaseUrl: "https://nadoapi-production.up.railway.app",
        fetcher,
      }),
    ).resolves.toEqual({
      data: [
        {
          createdAt: "2026-06-09T00:00:00.000Z",
          id: "item-1",
          meanings: [
            {
              createdAt: "2026-06-09T00:00:00.000Z",
              meaning: "궁금해하다",
              note: "정중하게 질문을 꺼내는 표현",
            },
          ],
          term: "wondering",
          type: "word",
          updatedAt: "2026-06-09T00:00:00.000Z",
        },
      ],
      status: "success",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://nadoapi-production.up.railway.app/api/vocabulary",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("loads subsequent mobile vocabulary cursor pages", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ items: [], nextCursor: "next/cursor" }),
      )
      .mockResolvedValueOnce(Response.json({ items: [], nextCursor: null }));

    await expect(
      listVocabulary("access-token", {
        apiBaseUrl: "https://nadoapi-production.up.railway.app",
        fetcher,
      }),
    ).resolves.toEqual({ data: [], status: "success" });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://nadoapi-production.up.railway.app/api/vocabulary?cursor=next%2Fcursor",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("saveVocabularyItem", () => {
  it("saves an authenticated vocabulary suggestion through the mobile API", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        item: {
          createdAt: "2026-06-10T00:00:00.000Z",
          id: "item-2",
          meanings: [
            {
              createdAt: "2026-06-10T00:00:00.000Z",
              meaning: "피해야 할 것",
              note: "분석 결과에서 추천된 표현",
            },
          ],
          term: "what to avoid",
          type: "phrase",
          updatedAt: "2026-06-10T00:00:00.000Z",
        },
      }),
    );

    await expect(
      saveVocabularyItem(
        {
          meaning: "피해야 할 것",
          note: "분석 결과에서 추천된 표현",
          term: "what to avoid",
          type: "phrase",
        },
        "access-token",
        {
          apiBaseUrl: "https://nadoapi-production.up.railway.app",
          fetcher,
        },
      ),
    ).resolves.toEqual({
      data: {
        createdAt: "2026-06-10T00:00:00.000Z",
        id: "item-2",
        meanings: [
          {
            createdAt: "2026-06-10T00:00:00.000Z",
            meaning: "피해야 할 것",
            note: "분석 결과에서 추천된 표현",
          },
        ],
        term: "what to avoid",
        type: "phrase",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
      status: "success",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://nadoapi-production.up.railway.app/api/vocabulary",
      expect.objectContaining({
        body: JSON.stringify({
          meaning: "피해야 할 것",
          note: "분석 결과에서 추천된 표현",
          term: "what to avoid",
          type: "phrase",
        }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe("deleteVocabularyMeaning", () => {
  it("returns the updated card after deleting one meaning", async () => {
    const updatedItem = {
      createdAt: "2026-06-09T00:00:00.000Z",
      id: "item-1",
      meanings: [{ meaning: "지역 주" }],
      term: "state",
      type: "word" as const,
      updatedAt: "2026-06-09T00:01:00.000Z",
    };
    const fetcher = vi.fn(async () =>
      Response.json({ item: updatedItem, itemDeleted: false }),
    );

    await expect(
      deleteVocabularyMeaning("item-1", { meaning: "상태" }, "access-token", {
        apiBaseUrl: "https://nadoapi-production.up.railway.app",
        fetcher,
      }),
    ).resolves.toEqual({
      data: { item: updatedItem, itemDeleted: false },
      status: "success",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://nadoapi-production.up.railway.app/api/vocabulary/item-1/meanings",
      expect.objectContaining({
        body: JSON.stringify({ meaning: "상태" }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "DELETE",
      }),
    );
  });

  it("treats an already deleted item as an idempotent not-found result", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        {
          error: { message: "단어장 뜻을 찾을 수 없습니다." },
        },
        { status: 404 },
      ),
    );

    await expect(
      deleteVocabularyMeaning(
        "item-1",
        { meaning: "궁금해하다" },
        "access-token",
        {
          apiBaseUrl: "https://nadoapi-production.up.railway.app",
          fetcher,
        },
      ),
    ).resolves.toEqual({
      message: "단어장 뜻을 찾을 수 없습니다.",
      status: "not-found",
    });
  });
});
