import { useEffect, useState } from "react";
import { Button } from "@nado/ui";
import { useAuthState } from "./authState";
import {
  getNextReviewIndex,
  getReviewCard,
  reviewDirectionOptions,
  type ReviewDirection,
} from "./reviewHelpers";
import { getVocabularyPanelState } from "./vocabularyViewState";
import { useVocabularyState } from "./vocabularyState";

type ReviewStatus = "loading" | "ready";

export function ReviewFlow() {
  const authState = useAuthState();
  const vocabularyState = useVocabularyState();
  const [direction, setDirection] =
    useState<ReviewDirection>("english-to-korean");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const items = vocabularyState.items;
  const status: ReviewStatus =
    authState.status === "loading" || vocabularyState.status === "loading"
      ? "loading"
      : "ready";
  const message = vocabularyState.message;
  const currentItem = items[currentIndex];
  const isLoading = status === "loading";
  const panelState = getVocabularyPanelState({
    authStatus: authState.status,
    isLoading,
    itemCount: items.length,
    message,
  });

  useEffect(() => {
    setCurrentIndex((index) =>
      items.length === 0 ? 0 : Math.min(index, items.length - 1),
    );
    setIsAnswerRevealed(false);
  }, [items.length]);

  useEffect(() => {
    if (authState.status !== "authenticated") {
      setCurrentIndex(0);
      setIsAnswerRevealed(false);
    }
  }, [authState.status]);

  if (panelState === "loading") {
    return (
      <div className="nado-empty-panel" role="status">
        <span className="nado-eyebrow">확인 중</span>
        <h2>로그인 세션을 확인하고 있어요</h2>
        <p>복습 카드를 불러오기 전에 계정 상태를 먼저 확인합니다.</p>
      </div>
    );
  }

  if (panelState === "auth_required") {
    return (
      <div className="nado-empty-panel">
        <span className="nado-eyebrow">로그인 필요</span>
        <h2>로그인 후 복습을 이용할 수 있어요</h2>
        <p>Google 로그인 후 단어장에 저장한 항목으로 복습을 이어가 주세요.</p>
      </div>
    );
  }

  if (panelState === "error") {
    return (
      <div className="nado-empty-panel" role="alert">
        <span className="nado-eyebrow">연결 오류</span>
        <h2>복습 단어를 불러오지 못했어요</h2>
        <p>{message}</p>
      </div>
    );
  }

  if (panelState === "empty" || !currentItem) {
    return (
      <div className="nado-empty-panel">
        <span className="nado-eyebrow">저장 전</span>
        <h2>복습할 단어가 없어요</h2>
        <p>분석 결과에서 단어를 저장하면 바로 복습 카드로 이어집니다.</p>
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
        <span className="nado-eyebrow">My flashcard</span>
        <span className="nado-review-card__meta">
          {currentIndex + 1} / {items.length}
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
