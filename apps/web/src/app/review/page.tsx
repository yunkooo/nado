import { AppShell } from "../AppShell";
import { ReviewFlow } from "./ReviewFlow";

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

          <section className="nado-page-notice" aria-label="복습 데이터 안내">
            <strong>로그인하면 내 단어장으로 복습해요</strong>
            <span>
              로그인 전에는 목업 데이터로 정답을 열고 다음 카드로 넘어가는
              흐름을 먼저 볼 수 있어요.
            </span>
          </section>

          <ReviewFlow />
        </div>
      </section>
    </AppShell>
  );
}
