import { afterEach, describe, expect, it, vi } from "vitest";
import {
  moveVocabularyPage,
  resetVocabularyPaginationScroll,
} from "./vocabularyPagination";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("vocabulary pagination navigation", () => {
  it("moves to the next page and resets the scroll position", () => {
    const setPage = vi.fn();
    const scrollTarget = { scrollTo: vi.fn() };

    moveVocabularyPage(2, setPage, scrollTarget);

    expect(setPage).toHaveBeenCalledWith(2);
    expect(scrollTarget.scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 0,
    });
  });

  it("falls back to the window when no target is provided", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    resetVocabularyPaginationScroll();

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
  });

  it("falls back to the window when the target cannot scroll", () => {
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
