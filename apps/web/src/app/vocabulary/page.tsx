import { Button } from "@nado/ui";
import { AppShell } from "../AppShell";

const vocabularyPreviewItems = [
  {
    date: "2026.06.09",
    meanings: ["궁금해하다", "정중하게 질문을 꺼내는 표현"],
    term: "wondering",
    type: "word",
  },
  {
    date: "2026.06.09",
    meanings: ["도와주다", "상대에게 도움을 요청할 때 쓰는 동사"],
    term: "help",
    type: "word",
  },
];

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
            <Button variant="secondary">Google 로그인</Button>
          </header>

          <section className="nado-page-notice" aria-label="로그인 안내">
            <strong>Google 로그인이 필요해요</strong>
            <span>
              로그인하면 저장한 단어와 표현을 이 화면에서 볼 수 있어요.
            </span>
          </section>

          <section className="nado-vocabulary-layout">
            <div className="nado-empty-panel">
              <span className="nado-eyebrow">비어 있음</span>
              <h2>단어장 항목이 아직 없어요</h2>
              <p>저장된 단어와 표현이 없습니다.</p>
            </div>

            <div className="nado-vocabulary-list" aria-label="단어장 미리보기">
              {vocabularyPreviewItems.map((item) => (
                <article className="nado-vocabulary-item" key={item.term}>
                  <header>
                    <div>
                      <h2>{item.term}</h2>
                      <span>{item.type}</span>
                    </div>
                    <time>{item.date}</time>
                  </header>
                  <ul>
                    {item.meanings.map((meaning) => (
                      <li key={meaning}>{meaning}</li>
                    ))}
                  </ul>
                  <Button disabled size="sm" variant="secondary">
                    삭제
                  </Button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
