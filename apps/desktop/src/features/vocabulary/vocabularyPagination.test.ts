import { describe, expect, it } from "vitest";
import {
  VOCABULARY_ITEMS_PER_PAGE,
  getVocabularyPage,
} from "./vocabularyPagination";

const items = Array.from({ length: 23 }, (_, index) => `item-${index + 1}`);

describe("desktop vocabulary pagination", () => {
  it("shows ten vocabulary items per page", () => {
    const page = getVocabularyPage(items, 1);

    expect(VOCABULARY_ITEMS_PER_PAGE).toBe(10);
    expect(page.items).toEqual(items.slice(0, 10));
    expect(page.pageCount).toBe(3);
    expect(page.canGoPrevious).toBe(false);
    expect(page.canGoNext).toBe(true);
  });

  it("returns the requested page slice and range label values", () => {
    const page = getVocabularyPage(items, 2);

    expect(page.items).toEqual(items.slice(10, 20));
    expect(page.startItemNumber).toBe(11);
    expect(page.endItemNumber).toBe(20);
    expect(page.canGoPrevious).toBe(true);
    expect(page.canGoNext).toBe(true);
  });

  it("clamps out-of-range pages to the last available page", () => {
    const page = getVocabularyPage(items, 9);

    expect(page.currentPage).toBe(3);
    expect(page.items).toEqual(items.slice(20));
    expect(page.startItemNumber).toBe(21);
    expect(page.endItemNumber).toBe(23);
    expect(page.canGoNext).toBe(false);
  });
});
