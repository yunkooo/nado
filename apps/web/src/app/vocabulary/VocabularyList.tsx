import { Button } from "@nado/ui";
import type { VocabularyItem } from "@nado/shared";

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

      <div className="nado-vocabulary-list">
        {items.map((item) => (
          <VocabularyListItem
            isDeleting={deletingItemId === item.id}
            item={item}
            key={item.id}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
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
        {item.meanings.map((meaning) => (
          <span
            className="nado-vocabulary-meaning"
            key={`${item.id}-${meaning.meaning}`}
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
