export interface VocabularyListItemProps {
  context?: string;
  meaning: string;
  meta?: string;
  term: string;
}

export function VocabularyListItem({
  context,
  meaning,
  meta,
  term,
}: VocabularyListItemProps) {
  return (
    <article className="nado-vocabulary-item">
      <div className="nado-vocabulary-item__main">
        <strong className="nado-vocabulary-item__term">{term}</strong>
        <span className="nado-vocabulary-item__meaning">{meaning}</span>
      </div>
      {meta ? <span className="nado-vocabulary-item__meta">{meta}</span> : null}
      {context ? (
        <p className="nado-vocabulary-item__context">{context}</p>
      ) : null}
    </article>
  );
}

export interface VocabularyStateProps {
  description: string;
  title: string;
}

export function VocabularyEmptyState({
  description,
  title,
}: VocabularyStateProps) {
  return (
    <section className="nado-state-card nado-state-card--empty">
      <strong className="nado-state-card__title">{title}</strong>
      <p className="nado-state-card__description">{description}</p>
    </section>
  );
}

export function VocabularyErrorState({
  description,
  title,
}: VocabularyStateProps) {
  return (
    <section className="nado-state-card nado-state-card--error">
      <strong className="nado-state-card__title">{title}</strong>
      <p className="nado-state-card__description">{description}</p>
    </section>
  );
}

export interface ReviewCardProps {
  answer: string;
  example?: string;
  isRevealed: boolean;
  prompt: string;
}

export function ReviewCard({
  answer,
  example,
  isRevealed,
  prompt,
}: ReviewCardProps) {
  return (
    <article
      className={[
        "nado-review-card",
        isRevealed ? "nado-review-card--revealed" : "nado-review-card--hidden",
      ].join(" ")}
    >
      <span className="nado-eyebrow">복습 카드</span>
      <strong className="nado-review-card__prompt">{prompt}</strong>
      {isRevealed ? (
        <div className="nado-review-card__answer">
          <span>{answer}</span>
          {example ? <p>{example}</p> : null}
        </div>
      ) : (
        <span className="nado-review-card__placeholder">정답 가림</span>
      )}
    </article>
  );
}
