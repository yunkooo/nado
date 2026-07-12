import { afterEach, describe, expect, it, vi } from "vitest";
import {
  moveVocabularyPage,
  paginateVocabularyItems,
  resetVocabularyPaginationScroll,
} from "./vocabularyPagination";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("paginateVocabularyItems", () => {
  it("shows vocabulary items in pages of 10", () => {
    const items = Array.from({ length: 24 }, (_, index) => `item-${index + 1}`);

    expect(paginateVocabularyItems(items, 2).items).toEqual([
      "item-11",
      "item-12",
      "item-13",
      "item-14",
      "item-15",
      "item-16",
      "item-17",
      "item-18",
      "item-19",
      "item-20",
    ]);
  });

  it("clamps the current page to the available vocabulary page range", () => {
    const items = Array.from({ length: 11 }, (_, index) => `item-${index + 1}`);

    expect(paginateVocabularyItems(items, 4)).toMatchObject({
      currentPage: 2,
      pageCount: 2,
      totalPages: 2,
    });
    expect(paginateVocabularyItems(items, 0)).toMatchObject({
      currentPage: 1,
      pageCount: 2,
      totalPages: 2,
    });
  });

  it("keeps an empty vocabulary list on page 1", () => {
    expect(paginateVocabularyItems([], 3)).toEqual({
      canGoNext: false,
      canGoPrevious: false,
      currentPage: 1,
      endItemNumber: 0,
      items: [],
      pageCount: 1,
      pageSize: 10,
      startItemNumber: 0,
      totalItems: 0,
      totalPages: 1,
    });
  });
});

describe("vocabulary pagination navigation", () => {
  it("moves to the requested page and resets the target scroll position", () => {
    const setPage = vi.fn();
    const scrollTarget = {
      scrollTo: vi.fn(),
    };

    moveVocabularyPage(2, setPage, scrollTarget);

    expect(setPage).toHaveBeenCalledWith(2);
    expect(scrollTarget.scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 0,
    });
  });

  it("falls back to the global scroll position for a non-scrollable target", () => {
    const scrollTo = vi.fn();
    const scrollTarget = {
      clientHeight: 100,
      scrollHeight: 100,
      scrollTo: vi.fn(),
    };

    vi.stubGlobal("scrollTo", scrollTo);
    resetVocabularyPaginationScroll(scrollTarget);

    expect(scrollTarget.scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 0,
    });
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
  });
});
