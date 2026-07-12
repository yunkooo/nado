export const VOCABULARY_PAGE_SIZE = 10;

export type VocabularyPaginationResult<T> = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentPage: number;
  endItemNumber: number;
  items: T[];
  pageCount: number;
  pageSize: number;
  startItemNumber: number;
  totalItems: number;
  totalPages: number;
};

export function paginateVocabularyItems<T>(
  items: T[],
  page: number,
): VocabularyPaginationResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / VOCABULARY_PAGE_SIZE));
  const requestedPage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const currentPage = Math.min(Math.max(1, requestedPage), pageCount);
  const startIndex = (currentPage - 1) * VOCABULARY_PAGE_SIZE;
  const pageItems = items.slice(startIndex, startIndex + VOCABULARY_PAGE_SIZE);

  return {
    canGoNext: currentPage < pageCount,
    canGoPrevious: currentPage > 1,
    currentPage,
    endItemNumber: startIndex + pageItems.length,
    items: pageItems,
    pageCount,
    pageSize: VOCABULARY_PAGE_SIZE,
    startItemNumber: pageItems.length > 0 ? startIndex + 1 : 0,
    totalItems: items.length,
    totalPages: pageCount,
  };
}

type ScrollTarget = {
  clientHeight?: number;
  scrollHeight?: number;
  scrollTo(options: { behavior: "auto"; top: number }): void;
};

export function resetVocabularyPaginationScroll(
  scrollTarget?: ScrollTarget | null,
) {
  if (scrollTarget) {
    scrollTarget.scrollTo({ behavior: "auto", top: 0 });

    if (canScroll(scrollTarget)) {
      return;
    }
  }

  if (typeof globalThis.scrollTo === "function") {
    globalThis.scrollTo({ behavior: "auto", top: 0 });
  }
}

export function moveVocabularyPage(
  nextPage: number,
  setPage: (page: number) => void,
  scrollTarget?: ScrollTarget | null,
) {
  setPage(nextPage);
  resetVocabularyPaginationScroll(scrollTarget);
}

function canScroll(scrollTarget: ScrollTarget): boolean {
  if (
    typeof scrollTarget.scrollHeight !== "number" ||
    typeof scrollTarget.clientHeight !== "number"
  ) {
    return true;
  }

  return scrollTarget.scrollHeight > scrollTarget.clientHeight;
}
