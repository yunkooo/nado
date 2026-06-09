import { AppShell } from "../AppShell";
import { VocabularyMockFlow } from "./VocabularyMockFlow";

export default function VocabularyPage() {
  return (
    <AppShell activeItem="vocabulary" workspaceLabel="단어장 화면">
      <section className="nado-content-workspace">
        <div className="nado-page">
          <header className="nado-page-header">
            <div>
              <p className="nado-eyebrow">Vocabulary</p>
              <h1 className="nado-page-title">단어장</h1>
            </div>
          </header>

          <section className="nado-page-notice" aria-label="목업 안내">
            <strong>Google 로그인 연결 전이에요</strong>
            <span>
              지금은 목업 데이터로 체험 중이에요. 로그인 없이 단어장 흐름을 먼저
              확인할 수 있어요.
            </span>
          </section>

          <VocabularyMockFlow />
        </div>
      </section>
    </AppShell>
  );
}
