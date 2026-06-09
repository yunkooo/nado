"use client";

import { useState } from "react";
import { Button } from "@nado/ui";
import {
  getNextReviewIndex,
  getReviewCard,
  mockVocabularyItems,
  reviewDirectionOptions,
} from "../mockVocabularyFlow";
import type { ReviewDirection } from "../mockVocabularyFlow";

export function ReviewMockFlow() {
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const currentItem = mockVocabularyItems[currentIndex];

  if (!currentItem) {
    return (
      <div className="nado-empty-panel">
        <span className="nado-eyebrow">비어 있음</span>
        <h2>복습할 단어가 없어요</h2>
        <p>단어장에 저장된 목업 항목이 없습니다.</p>
      </div>
    );
  }

  const card = getReviewCard(currentItem, direction);

  const changeDirection = (nextDirection: ReviewDirection) => {
    setDirection(nextDirection);
    setIsAnswerRevealed(false);
  };

  const moveNext = () => {
    setCurrentIndex((index) =>
      getNextReviewIndex(index, mockVocabularyItems.length),
    );
    setIsAnswerRevealed(false);
  };

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
              onClick={() => changeDirection(option.key)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <article className="nado-review-card">
        <span className="nado-eyebrow">Flashcard</span>
        <span className="nado-review-card__meta">
          {currentIndex + 1} / {mockVocabularyItems.length}
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
        <p className="nado-review-card__note">{card.note}</p>
      </article>

      <div className="nado-review-actions">
        <Button
          onClick={() => setIsAnswerRevealed((isRevealed) => !isRevealed)}
          variant="secondary"
        >
          {isAnswerRevealed ? "정답 가리기" : "정답 보기"}
        </Button>
        <Button onClick={moveNext}>다음</Button>
      </div>
    </section>
  );
}
