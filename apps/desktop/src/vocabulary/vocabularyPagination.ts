export const VOCABULARY_ITEMS_PER_PAGE = 10;

export type VocabularyPage<T> = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentPage: number;
  endItemNumber: number;
  items: T[];
  pageCount: number;
  startItemNumber: number;
  totalItems: number;
};

export function getVocabularyPage<T>(
  items: T[],
  requestedPage: number,
): VocabularyPage<T> {
  const totalItems = items.length;
  const pageCount = Math.max(
    1,
    Math.ceil(totalItems / VOCABULARY_ITEMS_PER_PAGE),
  );
  const currentPage = clampPage(requestedPage, pageCount);
  const startIndex = (currentPage - 1) * VOCABULARY_ITEMS_PER_PAGE;
  const pageItems = items.slice(
    startIndex,
    startIndex + VOCABULARY_ITEMS_PER_PAGE,
  );
  const startItemNumber = pageItems.length > 0 ? startIndex + 1 : 0;
  const endItemNumber = startIndex + pageItems.length;

  return {
    canGoNext: currentPage < pageCount,
    canGoPrevious: currentPage > 1,
    currentPage,
    endItemNumber,
    items: pageItems,
    pageCount,
    startItemNumber,
    totalItems,
  };
}

function clampPage(requestedPage: number, pageCount: number) {
  if (!Number.isFinite(requestedPage)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.trunc(requestedPage)), pageCount);
}
