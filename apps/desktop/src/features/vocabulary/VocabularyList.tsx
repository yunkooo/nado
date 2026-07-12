import { useEffect, useRef, useState } from "react";
import { paginateVocabularyItems } from "@nado/shared/vocabulary-pagination";
import type {
  VocabularyItem,
  VocabularyMeaning,
} from "@nado/shared/vocabulary";
import { Button } from "@nado/ui-web/Button";
import { VocabularyItemCard } from "@nado/ui-web/VocabularyItemCard";

type VocabularyListProps = {
  deleteMessage: string | null;
  deletingMeaningKeys: ReadonlySet<string>;
  isLoading: boolean;
  items: VocabularyItem[];
  onDeleteMeaning: (itemId: string, meaning: VocabularyMeaning) => void;
};

export function VocabularyList({
  deleteMessage,
  deletingMeaningKeys,
  isLoading,
  items,
  onDeleteMeaning,
}: VocabularyListProps) {
  const [requestedPage, setRequestedPage] = useState(1);
  const listTopRef = useRef<HTMLElement>(null);
  const pagination = paginateVocabularyItems(items, requestedPage);
  const currentPage = pagination.currentPage;

  useEffect(() => {
    if (requestedPage !== currentPage) {
      setRequestedPage(currentPage);
    }
  }, [currentPage, requestedPage]);

  const moveToPage = (nextPage: number) => {
    setRequestedPage(nextPage);
    window.requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({ block: "start" });
    });
  };

  return (
    <section
      className="nado-vocabulary-list-wrap"
      aria-label="내 단어장 목록"
      ref={listTopRef}
    >
      <header className="nado-section-header">
        <div>
          <span className="nado-eyebrow">My vocabulary</span>
          <h2>저장한 단어를 확인해요</h2>
        </div>
        <span>
          {isLoading
            ? "단어장을 새로고침하고 있어요"
            : `총 ${pagination.totalItems}개 중 ${pagination.startItemNumber}-${pagination.endItemNumber}`}
        </span>
      </header>

      {deleteMessage ? (
        <p className="nado-vocabulary-list-message" role="alert">
          {deleteMessage}
        </p>
      ) : null}

      <div className="nado-vocabulary-list">
        {pagination.items.map((item) => (
          <VocabularyItemCard
            deletingMeaningKeys={deletingMeaningKeys}
            item={item}
            key={item.id}
            onDeleteMeaning={(meaning) => onDeleteMeaning(item.id, meaning)}
          />
        ))}
      </div>
      {pagination.pageCount > 1 ? (
        <footer className="nado-vocabulary-pagination">
          <span>
            {currentPage} / {pagination.pageCount} 페이지
          </span>
          <div className="nado-vocabulary-pagination__actions">
            <Button
              disabled={!pagination.canGoPrevious}
              onClick={() => moveToPage(currentPage - 1)}
              size="sm"
              variant="secondary"
            >
              이전
            </Button>
            <Button
              disabled={!pagination.canGoNext}
              onClick={() => moveToPage(currentPage + 1)}
              size="sm"
              variant="secondary"
            >
              다음
            </Button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
