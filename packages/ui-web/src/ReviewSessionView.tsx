import { Button } from "./Button";
import {
  reviewDirectionOptions,
  type ReviewCard,
  type ReviewDirection,
} from "@nado/shared/review";

export type ReviewSessionViewProps = {
  card: ReviewCard;
  currentIndex: number;
  direction: ReviewDirection;
  isAnswerRevealed: boolean;
  itemCount: number;
  onChangeDirection: (direction: ReviewDirection) => void;
  onMoveNext: () => void;
  onToggleAnswer: () => void;
};

export function ReviewSessionView({
  card,
  currentIndex,
  direction,
  isAnswerRevealed,
  itemCount,
  onChangeDirection,
  onMoveNext,
  onToggleAnswer,
}: ReviewSessionViewProps) {
  return (
    <section className="nado-review-layout">
      <div className="nado-review-controls" aria-label="복습 방향">
        {reviewDirectionOptions.map((option) => {
          const isActive = option.key === direction;

          return (
            <button
              aria-pressed={isActive}
              className={[
                "nado-review-direction",
                isActive ? "nado-review-direction--active" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              key={option.key}
              onClick={() => onChangeDirection(option.key)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <article className="nado-review-card">
        <span className="nado-eyebrow">My flashcard</span>
        <span className="nado-review-card__meta">
          {currentIndex + 1} / {itemCount}
        </span>
        <h2>{card.prompt}</h2>
        <p
          aria-hidden={isAnswerRevealed ? undefined : true}
          className={[
            "nado-review-card__answer",
            isAnswerRevealed ? "nado-review-card__answer--revealed" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {card.answer}
        </p>
      </article>

      <div className="nado-review-actions">
        <Button onClick={onToggleAnswer} variant="secondary">
          {isAnswerRevealed ? "정답 가리기" : "정답 보기"}
        </Button>
        <Button onClick={onMoveNext}>다음</Button>
      </div>
    </section>
  );
}
