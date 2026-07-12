import {
  createVocabularyMeaningMutationKey,
  createVocabularyMeaningRenderKey,
  getDistinctVocabularyNote,
  type VocabularyItem,
  type VocabularyMeaning,
} from "@nado/shared/vocabulary";

export type VocabularyItemCardProps = {
  deletingMeaningKeys: ReadonlySet<string>;
  item: VocabularyItem;
  onDeleteMeaning: (meaning: VocabularyMeaning) => void;
};

export function VocabularyItemCard({
  deletingMeaningKeys,
  item,
  onDeleteMeaning,
}: VocabularyItemCardProps) {
  const isItemDeleting = item.meanings.some((meaning) =>
    deletingMeaningKeys.has(
      createVocabularyMeaningMutationKey(item.id, meaning),
    ),
  );

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
          const meaningKey = createVocabularyMeaningMutationKey(
            item.id,
            meaning,
          );
          const isDeleting = deletingMeaningKeys.has(meaningKey);
          const note = getDistinctVocabularyNote(meaning.note, [
            meaning.meaning,
          ]);

          return (
            <div
              className="nado-vocabulary-meaning"
              key={createVocabularyMeaningRenderKey(
                item.id,
                meaning,
                meaningIndex,
              )}
            >
              <div className="nado-vocabulary-meaning__content">
                <strong>{meaning.meaning}</strong>
                {note ? <small>{note}</small> : null}
              </div>
              <button
                aria-busy={isDeleting || undefined}
                aria-label={`${item.term}의 ${meaning.meaning} 뜻 삭제`}
                className="nado-vocabulary-meaning__delete"
                disabled={isItemDeleting}
                onClick={() => onDeleteMeaning(meaning)}
                type="button"
              >
                <span aria-hidden="true">{isDeleting ? "…" : "×"}</span>
              </button>
            </div>
          );
        })}
      </div>
      <footer className="nado-vocabulary-item__footer">
        <time className="nado-vocabulary-item__date" dateTime={item.updatedAt}>
          {formatVocabularyDate(item.updatedAt)}
        </time>
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
