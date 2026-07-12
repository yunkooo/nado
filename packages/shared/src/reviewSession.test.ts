import { describe, expect, it } from "vitest";
import type { VocabularyItem } from "./vocabularyContracts";
import {
  createReviewCardKey,
  getCurrentReviewIndex,
  getNextReviewIndex,
  getReviewCard,
  getReviewableItems,
} from "./reviewSession";

const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
  meanings: [
    { meaning: "   " },
    { meaning: "궁금해하다", note: "정중하게 질문을 꺼내는 표현" },
  ],
  term: "wondering",
  type: "word",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

describe("review session helpers", () => {
  it("keeps only vocabulary items with a reviewable meaning", () => {
    expect(
      getReviewableItems([
        { ...vocabularyItem, id: "empty", meanings: [] },
        vocabularyItem,
      ]).map((item) => item.id),
    ).toEqual(["row_1"]);
  });

  it("builds cards in both directions without exposing notes", () => {
    expect(getReviewCard(vocabularyItem, "english-to-korean")).toEqual({
      answer: "궁금해하다",
      prompt: "wondering",
    });
    expect(getReviewCard(vocabularyItem, "korean-to-english")).toEqual({
      answer: "wondering",
      prompt: "궁금해하다",
    });
  });

  it("keeps the current item across reorder and wraps the next index", () => {
    const otherItem = { ...vocabularyItem, id: "row_2", term: "avoid" };

    expect(getCurrentReviewIndex([otherItem, vocabularyItem], "row_1")).toBe(1);
    expect(getCurrentReviewIndex([otherItem], "deleted")).toBe(0);
    expect(getNextReviewIndex(2, 3)).toBe(0);
    expect(getNextReviewIndex(0, 0)).toBe(0);
  });

  it("changes the revealed card key with direction or updated time", () => {
    const initialKey = createReviewCardKey(vocabularyItem, "english-to-korean");

    expect(createReviewCardKey(vocabularyItem, "korean-to-english")).not.toBe(
      initialKey,
    );
    expect(
      createReviewCardKey(
        { ...vocabularyItem, updatedAt: "2026-06-10T00:00:00.000Z" },
        "english-to-korean",
      ),
    ).not.toBe(initialKey);
  });
});
