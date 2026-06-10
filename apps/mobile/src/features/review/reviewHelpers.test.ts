import { describe, expect, it } from "vitest";
import { getNextReviewIndex, getReviewCard } from "./reviewHelpers";

const item = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "item-1",
  meanings: [{ meaning: "궁금해하다", note: "정중한 질문 표현" }],
  term: "wondering",
  type: "word" as const,
  updatedAt: "2026-06-09T00:00:00.000Z",
};

describe("mobile review helpers", () => {
  it("builds review cards from real vocabulary items", () => {
    expect(getReviewCard(item, "english-to-korean")).toEqual({
      answer: "궁금해하다",
      note: "정중한 질문 표현",
      prompt: "wondering",
    });
    expect(getReviewCard(item, "korean-to-english")).toEqual({
      answer: "wondering",
      note: "정중한 질문 표현",
      prompt: "궁금해하다",
    });
  });

  it("moves to the next card and wraps", () => {
    expect(getNextReviewIndex(2, 3)).toBe(0);
  });
});
