export type VocabularyPaginationScrollTarget = {
  clientHeight?: number;
  scrollHeight?: number;
  scrollTo(options: { behavior: "auto"; top: number }): void;
};

export function resetVocabularyPaginationScroll(
  scrollTarget?: VocabularyPaginationScrollTarget | null,
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
  scrollTarget?: VocabularyPaginationScrollTarget | null,
) {
  setPage(nextPage);
  resetVocabularyPaginationScroll(scrollTarget);
}

function canScroll(scrollTarget: VocabularyPaginationScrollTarget): boolean {
  if (
    typeof scrollTarget.scrollHeight !== "number" ||
    typeof scrollTarget.clientHeight !== "number"
  ) {
    return true;
  }

  return scrollTarget.scrollHeight > scrollTarget.clientHeight;
}
