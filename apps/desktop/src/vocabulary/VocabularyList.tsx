import { useEffect, useRef, useState } from "react";
import {
  createVocabularyMeaningRenderKey,
  type VocabularyItem,
} from "@nado/shared";
import { Button } from "@nado/ui";
import { getVocabularyPage } from "./vocabularyPagination";

type VocabularyListProps = {
  deletingItemId: string | null;
  isLoading: boolean;
  items: VocabularyItem[];
  onDeleteItem: (itemId: string) => void;
};

export function VocabularyList({
  deletingItemId,
  isLoading,
  items,
  onDeleteItem,
}: VocabularyListProps) {
  const [requestedPage, setRequestedPage] = useState(1);
  const listTopRef = useRef<HTMLElement>(null);
  const pagination = getVocabularyPage(items, requestedPage);
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
            ? "로그인 세션을 확인하고 있어요"
            : `총 ${pagination.totalItems}개 중 ${pagination.startItemNumber}-${pagination.endItemNumber}`}
        </span>
      </header>

      <div className="nado-vocabulary-list">
        {pagination.items.map((item) => (
          <VocabularyListItem
            isDeleting={deletingItemId === item.id}
            item={item}
            key={item.id}
            onDelete={() => onDeleteItem(item.id)}
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

type VocabularyListItemProps = {
  isDeleting: boolean;
  item: VocabularyItem;
  onDelete: () => void;
};

function VocabularyListItem({
  isDeleting,
  item,
  onDelete,
}: VocabularyListItemProps) {
  return (
    <article className="nado-vocabulary-item">
      <header>
        <div>
          <h2>{item.term}</h2>
          <span className="nado-vocabulary-type">{item.type}</span>
        </div>
      </header>
      <div
        className="nado-vocabulary-meaning-list"
        aria-label={`${item.term} 뜻`}
      >
        {item.meanings.map((meaning, meaningIndex) => (
          <span
            className="nado-vocabulary-meaning"
            key={createVocabularyMeaningRenderKey(
              item.id,
              meaning,
              meaningIndex,
            )}
          >
            <strong>{meaning.meaning}</strong>
            {meaning.note ? <small>{meaning.note}</small> : null}
          </span>
        ))}
      </div>
      <footer className="nado-vocabulary-item__footer">
        <time className="nado-vocabulary-item__date" dateTime={item.updatedAt}>
          {formatVocabularyDate(item.updatedAt)}
        </time>
        <Button
          disabled={isDeleting}
          onClick={onDelete}
          size="sm"
          variant="secondary"
        >
          {isDeleting ? "삭제 중" : "삭제"}
        </Button>
      </footer>
    </article>
  );
}

function formatVocabularyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}
