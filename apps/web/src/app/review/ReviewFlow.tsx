"use client";

import { useEffect, useState } from "react";
import { Button } from "@nado/ui";
import { getCurrentAccessToken } from "../authClient";
import {
  getNextReviewIndex,
  getReviewCard,
  mockVocabularyItems,
  reviewDirectionOptions,
} from "../mockVocabularyFlow";
import { listVocabulary } from "../vocabularyApi";
import type { ReviewDirection } from "../mockVocabularyFlow";
import type { VocabularyItem } from "@nado/shared";

type ReviewSource = "account" | "mock";
type ReviewStatus = "loading" | "ready";

export function ReviewFlow() {
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const [items, setItems] = useState<VocabularyItem[]>(mockVocabularyItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [source, setSource] = useState<ReviewSource>("mock");
  const [status, setStatus] = useState<ReviewStatus>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const currentItem = items[currentIndex];

  useEffect(() => {
    let isCurrent = true;

    async function loadVocabularyForSession() {
      setStatus("loading");

      const token = await getCurrentAccessToken();

      if (!isCurrent) {
        return;
      }

      if (!token) {
        setItems(mockVocabularyItems);
        setCurrentIndex(0);
        setIsAnswerRevealed(false);
        setMessage(null);
        setSource("mock");
        setStatus("ready");
        return;
      }

      setSource("account");

      const result = await listVocabulary(token);

      if (!isCurrent) {
        return;
      }

      if (result.status === "success") {
        setItems(result.data);
        setMessage(null);
      } else {
        setItems([]);
        setMessage(result.message);
      }

      setCurrentIndex(0);
      setIsAnswerRevealed(false);
      setStatus("ready");
    }

    void loadVocabularyForSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  if (message) {
    return (
      <div className="nado-empty-panel" role="alert">
        <span className="nado-eyebrow">연결 오류</span>
        <h2>복습 단어를 불러오지 못했어요</h2>
        <p>{message}</p>
      </div>
    );
  }

  if (!currentItem) {
    const isAccountSource = source === "account";

    return (
      <div className="nado-empty-panel">
        <span className="nado-eyebrow">
          {isAccountSource ? "저장 전" : "비어 있음"}
        </span>
        <h2>복습할 단어가 없어요</h2>
        <p>
          {isAccountSource
            ? "분석 결과에서 단어를 저장하면 바로 복습 카드로 이어집니다."
            : "단어장에 저장된 목업 항목이 없습니다."}
        </p>
      </div>
    );
  }

  const card = getReviewCard(currentItem, direction);

  const changeDirection = (nextDirection: ReviewDirection) => {
    setDirection(nextDirection);
    setIsAnswerRevealed(false);
  };

  const moveNext = () => {
    setCurrentIndex((index) => getNextReviewIndex(index, items.length));
    setIsAnswerRevealed(false);
  };

  const isAccountSource = source === "account";

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
        <span className="nado-eyebrow">
          {isAccountSource ? "My flashcard" : "Flashcard"}
        </span>
        <span className="nado-review-card__meta">
          {status === "loading"
            ? "로그인 세션 확인 중"
            : `${currentIndex + 1} / ${items.length}`}
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
