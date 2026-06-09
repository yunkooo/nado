import { AppShell } from "../AppShell";
import { VocabularyFlow } from "./VocabularyFlow";

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

          <section className="nado-page-notice" aria-label="단어장 데이터 안내">
            <strong>로그인하면 실제 단어장을 불러와요</strong>
            <span>
              로그인 전에는 목업 데이터로 흐름을 먼저 확인할 수 있어요.
            </span>
          </section>

          <VocabularyFlow />
        </div>
      </section>
    </AppShell>
  );
}
