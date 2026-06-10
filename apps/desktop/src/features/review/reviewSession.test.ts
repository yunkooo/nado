import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it } from "vitest";
import { getNextReviewIndex, getReviewCard } from "./reviewSession";

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

describe("desktop review helpers", () => {
  it("builds an English to Korean review card", () => {
    expect(getReviewCard(vocabularyItem, "english-to-korean")).toEqual({
      answer: "검토하다",
      note: "일정이나 계획을 확인할 때 자주 씁니다.",
      prompt: "go over",
    });
  });

  it("builds a Korean to English review card", () => {
    expect(getReviewCard(vocabularyItem, "korean-to-english")).toEqual({
      answer: "go over",
      note: "일정이나 계획을 확인할 때 자주 씁니다.",
      prompt: "검토하다",
    });
  });

  it("moves to the next review card and wraps to the first item", () => {
    expect(getNextReviewIndex(0, 3)).toBe(1);
    expect(getNextReviewIndex(2, 3)).toBe(0);
    expect(getNextReviewIndex(0, 0)).toBe(0);
  });
});
