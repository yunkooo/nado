import { describe, expect, it, vi } from "vitest";
import { listVocabulary } from "./vocabularyApi";

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
      {
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });
});
