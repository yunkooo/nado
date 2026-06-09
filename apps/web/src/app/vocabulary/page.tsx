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

          <VocabularyFlow />
        </div>
      </section>
    </AppShell>
  );
}
