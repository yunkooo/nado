import { Button } from "@nado/ui-web/Button";
import type {
  ReviewCard as ReviewCardData,
  ReviewDirection,
} from "./reviewSession";
import { reviewDirectionOptions } from "./reviewSession";

type ReviewSessionViewProps = {
  card: ReviewCardData;
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
      <ReviewDirectionControl
        direction={direction}
        onChangeDirection={onChangeDirection}
      />

      <ReviewCard
        card={card}
        currentIndex={currentIndex}
        isAnswerRevealed={isAnswerRevealed}
        itemCount={itemCount}
      />

      <div className="nado-review-actions">
        <Button onClick={onToggleAnswer} variant="secondary">
          {isAnswerRevealed ? "정답 가리기" : "정답 보기"}
        </Button>
        <Button onClick={onMoveNext}>다음</Button>
      </div>
    </section>
  );
}

type ReviewDirectionControlProps = {
  direction: ReviewDirection;
  onChangeDirection: (direction: ReviewDirection) => void;
};

function ReviewDirectionControl({
  direction,
  onChangeDirection,
}: ReviewDirectionControlProps) {
  return (
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
  );
}

type ReviewCardProps = {
  card: ReviewCardData;
  currentIndex: number;
  isAnswerRevealed: boolean;
  itemCount: number;
};

function ReviewCard({
  card,
  currentIndex,
  isAnswerRevealed,
  itemCount,
}: ReviewCardProps) {
  return (
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
  );
}
