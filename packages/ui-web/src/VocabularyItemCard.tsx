import {
  createVocabularyMeaningRenderKey,
  getDistinctVocabularyNote,
  type VocabularyItem,
} from "@nado/shared/vocabulary";
import { Button } from "./Button";

export type VocabularyItemCardProps = {
  isDeleting: boolean;
  item: VocabularyItem;
  onDelete: () => void;
};

export function VocabularyItemCard({
  isDeleting,
  item,
  onDelete,
}: VocabularyItemCardProps) {
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
        {item.meanings.map((meaning, meaningIndex) => {
          const note = getDistinctVocabularyNote(meaning.note, [
            meaning.meaning,
          ]);

          return (
            <span
              className="nado-vocabulary-meaning"
              key={createVocabularyMeaningRenderKey(
                item.id,
                meaning,
                meaningIndex,
              )}
            >
              <strong>{meaning.meaning}</strong>
              {note ? <small>{note}</small> : null}
            </span>
          );
        })}
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

export function formatVocabularyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}
