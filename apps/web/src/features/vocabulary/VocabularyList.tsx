import { useState } from "react";
import { Button, VocabularyItemCard, moveVocabularyPage } from "@nado/ui";
import { paginateVocabularyItems } from "@nado/shared/vocabulary-pagination";
import type { VocabularyItem } from "@nado/shared/vocabulary";

type VocabularyListProps = {
  deleteMessage: string | null;
  deletingItemIds: ReadonlySet<string>;
  isLoading: boolean;
  items: VocabularyItem[];
  onDeleteItem: (itemId: string) => void;
};

export function VocabularyList({
  deleteMessage,
  deletingItemIds,
  isLoading,
  items,
  onDeleteItem,
}: VocabularyListProps) {
  const [page, setPage] = useState(1);
  const pagination = paginateVocabularyItems(items, page);

  return (
    <section className="nado-vocabulary-list-wrap" aria-label="내 단어장 목록">
      <header className="nado-section-header">
        <div>
          <span className="nado-eyebrow">My vocabulary</span>
          <h2>저장한 단어를 확인해요</h2>
        </div>
        <span>
          {isLoading
            ? "로그인 세션을 확인하고 있어요"
            : "분석에서 저장한 항목이에요"}
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
            isDeleting={deletingItemIds.has(item.id)}
            item={item}
            key={item.id}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>

      {pagination.pageCount > 1 ? (
        <nav className="nado-vocabulary-pagination" aria-label="단어장 페이지">
          <span>
            {pagination.startItemNumber}-{pagination.endItemNumber} /{" "}
            {pagination.totalItems}
          </span>
          <div>
            <Button
              disabled={!pagination.canGoPrevious}
              onClick={(event) =>
                moveVocabularyPage(
                  pagination.currentPage - 1,
                  setPage,
                  event.currentTarget.closest(
                    ".nado-content-workspace",
                  ) as HTMLElement | null,
                )
              }
              size="sm"
              variant="secondary"
            >
              이전
            </Button>
            <strong>
              {pagination.currentPage} / {pagination.pageCount}
            </strong>
            <Button
              disabled={!pagination.canGoNext}
              onClick={(event) =>
                moveVocabularyPage(
                  pagination.currentPage + 1,
                  setPage,
                  event.currentTarget.closest(
                    ".nado-content-workspace",
                  ) as HTMLElement | null,
                )
              }
              size="sm"
              variant="secondary"
            >
              다음
            </Button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
