import type { VocabularyItem } from "@nado/shared/vocabulary";
import { describe, expect, it, vi } from "vitest";
import {
  deleteVocabularyItem,
  listVocabulary,
  saveVocabularyItem,
} from "./vocabularyApi";
import { resolveApiUrl } from "./apiConfig";

const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
  meanings: [
    {
      createdAt: "2026-06-09T00:00:00.000Z",
      meaning: "검토하다",
      note: "일정이나 계획을 확인할 때 자주 씁니다.",
    },
  ],
  term: "go over",
  type: "phrase",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

describe("desktop vocabularyApi", () => {
  it("loads vocabulary items with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        items: [vocabularyItem],
      }),
    );

    await expect(listVocabulary("session-token", { fetcher })).resolves.toEqual(
      {
        data: [vocabularyItem],
        status: "success",
      },
    );
    expect(fetcher).toHaveBeenCalledWith(
      resolveApiUrl("/api/vocabulary"),
      expect.objectContaining({
        headers: { Authorization: "Bearer session-token" },
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("loads subsequent desktop vocabulary cursor pages", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ items: [], nextCursor: "next/cursor" }),
      )
      .mockResolvedValueOnce(Response.json({ items: [], nextCursor: null }));

    await expect(listVocabulary("session-token", { fetcher })).resolves.toEqual(
      {
        data: [],
        status: "success",
      },
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      resolveApiUrl("/api/vocabulary?cursor=next%2Fcursor"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("saves a vocabulary item with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        item: vocabularyItem,
      }),
    );

    await expect(
      saveVocabularyItem(
        {
          meaning: "검토하다",
          note: "일정이나 계획을 확인할 때 자주 씁니다.",
          term: "go over",
          type: "phrase",
        },
        "session-token",
        { fetcher },
      ),
    ).resolves.toEqual({
      data: vocabularyItem,
      status: "success",
    });
    expect(fetcher).toHaveBeenCalledWith(
      resolveApiUrl("/api/vocabulary"),
      expect.objectContaining({
        body: JSON.stringify({
          meaning: "검토하다",
          note: "일정이나 계획을 확인할 때 자주 씁니다.",
          term: "go over",
          type: "phrase",
        }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("deletes a vocabulary item with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(
      deleteVocabularyItem("row_1", "session-token", { fetcher }),
    ).resolves.toEqual({
      status: "success",
    });
    expect(fetcher).toHaveBeenCalledWith(
      resolveApiUrl("/api/vocabulary/row_1"),
      expect.objectContaining({
        headers: { Authorization: "Bearer session-token" },
        method: "DELETE",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("marks a missing vocabulary item delete as already removed", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        {
          error: {
            message: "단어장 항목을 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      ),
    );

    await expect(
      deleteVocabularyItem("row_1", "session-token", { fetcher }),
    ).resolves.toEqual({
      message: "단어장 항목을 찾을 수 없습니다.",
      status: "not-found",
    });
  });

  it("returns a delete-specific fallback message when deleting vocabulary fails", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      deleteVocabularyItem("row_1", "session-token", { fetcher }),
    ).resolves.toEqual({
      message: "단어장 항목을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });

  it("returns the API error message when loading vocabulary fails", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        {
          error: {
            message: "로그인이 필요해요.",
          },
        },
        { status: 401 },
      ),
    );

    await expect(listVocabulary("bad-token", { fetcher })).resolves.toEqual({
      message: "로그인이 필요해요.",
      status: "error",
    });
  });
});
