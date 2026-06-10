import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it } from "vitest";
import { getReviewCard, getReviewableItems } from "./reviewSession";

const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
  meanings: [
    {
      meaning: "   ",
    },
    {
      meaning: "궁금해하다",
      note: "정중하게 질문을 꺼내는 표현",
    },
  ],
  term: "wondering",
  type: "word",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

describe("review session helpers", () => {
  it("keeps only vocabulary items with a reviewable meaning", () => {
    expect(
      getReviewableItems([
        {
          ...vocabularyItem,
          id: "empty-row",
          meanings: [],
        },
        vocabularyItem,
      ]).map((item) => item.id),
    ).toEqual(["row_1"]);
  });

  it("uses the first non-empty meaning for review cards", () => {
    expect(getReviewCard(vocabularyItem, "english-to-korean")).toEqual({
      answer: "궁금해하다",
      prompt: "wondering",
    });
  });

  it("does not include notes in review cards", () => {
    expect(
      getReviewCard(
        {
          ...vocabularyItem,
          meanings: [{ meaning: "피하다", note: "뜻을 노출하는 설명" }],
          term: "avoid",
        },
        "english-to-korean",
      ),
    ).toEqual({
      answer: "피하다",
      prompt: "avoid",
    });
  });
});
