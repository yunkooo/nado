import { AppShell } from "../AppShell";
import { ReviewMockFlow } from "./ReviewMockFlow";

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
          </header>

          <section className="nado-page-notice" aria-label="목업 안내">
            <strong>Google 로그인 연결 전이에요</strong>
            <span>
              목업 데이터로 복습 flow를 확인해요. 정답을 열고 다음 카드로
              넘어가는 흐름을 먼저 볼 수 있어요.
            </span>
          </section>

          <ReviewMockFlow />
        </div>
      </section>
    </AppShell>
  );
}
