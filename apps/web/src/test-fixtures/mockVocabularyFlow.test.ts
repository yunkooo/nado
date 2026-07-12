import { describe, expect, it } from "vitest";
import {
  deleteMockVocabularyItem,
  getMockVocabularySummary,
  mockVocabularyItems,
} from "./mockVocabularyFlow";
import { getNextReviewIndex, getReviewCard } from "@nado/shared/review";

describe("mock vocabulary flow", () => {
  it("summarizes the mock vocabulary item count", () => {
    expect(getMockVocabularySummary(mockVocabularyItems)).toEqual({
      label: "저장 항목",
      value: String(mockVocabularyItems.length),
    });
  });

  it("removes a mock vocabulary item by id", () => {
    const [firstItem] = mockVocabularyItems;

    if (!firstItem) {
      throw new Error("Expected at least one mock vocabulary item.");
    }

    const remainingItems = deleteMockVocabularyItem(
      mockVocabularyItems,
      firstItem.id,
    );

    expect(remainingItems).toHaveLength(mockVocabularyItems.length - 1);
    expect(remainingItems.map((item) => item.id)).not.toContain(firstItem.id);
  });

  it("builds review card copy from the selected direction", () => {
    const [firstItem] = mockVocabularyItems;

    if (!firstItem) {
      throw new Error("Expected at least one mock vocabulary item.");
    }

    expect(getReviewCard(firstItem, "english-to-korean")).toMatchObject({
      answer: "궁금해하다",
      prompt: "wondering",
    });
    expect(getReviewCard(firstItem, "korean-to-english")).toMatchObject({
      answer: "wondering",
      prompt: "궁금해하다",
    });
  });

  it("moves to the next review card and wraps to the first item", () => {
    expect(getNextReviewIndex(0, mockVocabularyItems.length)).toBe(1);
    expect(
      getNextReviewIndex(
        mockVocabularyItems.length - 1,
        mockVocabularyItems.length,
      ),
    ).toBe(0);
  });
});
