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

    expect(fetcher).toHaveBeenCalledWith("/api/vocabulary", {
      headers: { Authorization: "Bearer session-token" },
      method: "GET",
    });
    expect(result).toEqual({
      data: [vocabularyItem],
      status: "success",
    });
  });

  it("deletes a vocabulary item with an authenticated bearer token", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));

    const result = await deleteVocabularyItem("row_1", "session-token", {
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith("/api/vocabulary/row_1", {
      headers: { Authorization: "Bearer session-token" },
      method: "DELETE",
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
});
