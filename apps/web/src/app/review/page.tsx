import { Button } from "@nado/ui";
import { AppShell } from "../AppShell";

const reviewDirections = ["영어 → 한국어", "한국어 → 영어"];

export default function ReviewPage() {
  return (
    <AppShell activeItem="review" workspaceLabel="복습 화면">
      <section className="nado-content-workspace">
        <div className="nado-page">
          <header className="nado-page-header">
            <div>
              <p className="nado-eyebrow">Review</p>
              <h1 className="nado-page-title">복습</h1>
            </div>
            <Button variant="secondary">Google 로그인</Button>
          </header>

          <section className="nado-page-notice" aria-label="로그인 안내">
            <strong>Google 로그인이 필요해요</strong>
            <span>로그인하면 저장한 단어로 복습을 시작할 수 있어요.</span>
          </section>

          <section className="nado-review-layout">
            <div className="nado-review-controls" aria-label="복습 방향">
              {reviewDirections.map((direction, index) => (
                <button
                  aria-pressed={index === 0}
                  className={[
                    "nado-review-direction",
                    index === 0 ? "nado-review-direction--active" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled
                  key={direction}
                  type="button"
                >
                  {direction}
                </button>
              ))}
            </div>

            <article className="nado-review-card">
              <span className="nado-eyebrow">Flashcard</span>
              <h2>wondering</h2>
              <p>정답은 아직 숨겨져 있어요</p>
            </article>

            <div className="nado-review-actions">
              <Button disabled variant="secondary">
                끝내기
              </Button>
              <Button disabled>다음</Button>
            </div>

            <div className="nado-empty-panel">
              <span className="nado-eyebrow">비어 있음</span>
              <h2>복습할 단어가 없어요</h2>
              <p>저장된 단어와 표현이 없습니다.</p>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
