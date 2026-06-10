import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it, vi } from "vitest";
import {
  deleteVocabularyItem,
  listVocabulary,
  saveVocabularyItem,
} from "./vocabularyApi";

const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
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
};

describe("vocabularyApi", () => {
  it("loads vocabulary items with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        items: [vocabularyItem],
      }),
    );

    const result = await listVocabulary("session-token", { fetcher });

    expect(fetcher).toHaveBeenCalledWith(
      "/api/vocabulary",
      expect.objectContaining({
        headers: { Authorization: "Bearer session-token" },
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual({
      data: [vocabularyItem],
      status: "success",
    });
  });

  it("treats an empty vocabulary response as a successful empty list", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        items: [],
      }),
    );

    await expect(listVocabulary("session-token", { fetcher })).resolves.toEqual(
      {
        data: [],
        status: "success",
      },
    );
  });

  it("deletes a vocabulary item with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));

    const result = await deleteVocabularyItem("row_1", "session-token", {
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith("/api/vocabulary/row_1", {
      headers: { Authorization: "Bearer session-token" },
      method: "DELETE",
      signal: expect.any(AbortSignal),
    });
    expect(result).toEqual({ status: "success" });
  });

  it("saves a vocabulary item with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        item: vocabularyItem,
      }),
    );

    const result = await saveVocabularyItem(
      {
        meaning: "궁금해하다",
        note: "정중하게 질문을 꺼내는 표현",
        term: "wondering",
        type: "word",
      },
      "session-token",
      { fetcher },
    );

    expect(fetcher).toHaveBeenCalledWith("/api/vocabulary", {
      body: JSON.stringify({
        meaning: "궁금해하다",
        note: "정중하게 질문을 꺼내는 표현",
        term: "wondering",
        type: "word",
      }),
      headers: {
        Authorization: "Bearer session-token",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: expect.any(AbortSignal),
    });
    expect(result).toEqual({
      data: vocabularyItem,
      status: "success",
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

    await expect(listVocabulary("session-token", { fetcher })).resolves.toEqual(
      {
        message: "로그인이 필요해요.",
        status: "error",
      },
    );
  });

  it("returns an error when loading vocabulary takes too long", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(
        async (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      );

      const resultPromise = listVocabulary("session-token", {
        fetcher,
        timeoutMs: 5,
      });

      await vi.advanceTimersByTimeAsync(5);

      await expect(resultPromise).resolves.toEqual({
        message:
          "단어장 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
        status: "error",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns a timeout error when deleting vocabulary takes too long", async () => {
    const fetcher = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });

    await expect(
      deleteVocabularyItem("row_1", "session-token", { fetcher }),
    ).resolves.toEqual({
      message:
        "단어장 삭제 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });

  it("returns a timeout error when saving vocabulary takes too long", async () => {
    const fetcher = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });

    await expect(
      saveVocabularyItem(
        {
          meaning: "궁금해하다",
          term: "wondering",
          type: "word",
        },
        "session-token",
        { fetcher },
      ),
    ).resolves.toEqual({
      message:
        "단어장 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });
});
