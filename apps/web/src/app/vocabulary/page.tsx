import { Button } from "@nado/ui";
import { AppShell } from "../AppShell";

const vocabularyPreviewItems = [
  {
    date: "2026.06.09",
    detail: "뜻 2개",
    meanings: ["궁금해하다", "정중하게 질문을 꺼내는 표현"],
    term: "wondering",
    type: "word",
  },
  {
    date: "2026.06.09",
    detail: "뜻 2개",
    meanings: ["도와주다", "상대에게 도움을 요청할 때 쓰는 동사"],
    term: "help",
    type: "word",
  },
];

const vocabularySummary = { label: "저장 항목", value: "0" };

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

          <section className="nado-page-notice" aria-label="로그인 안내">
            <strong>Google 로그인이 필요해요</strong>
            <span>
              로그인하면 저장한 단어와 표현을 이 화면에서 볼 수 있어요.
            </span>
          </section>

          <section className="nado-vocabulary-summary" aria-label="단어장 요약">
            <article className="nado-vocabulary-summary__item">
              <span>{vocabularySummary.label}</span>
              <strong>{vocabularySummary.value}</strong>
            </article>
          </section>

          <section className="nado-vocabulary-layout">
            <div className="nado-empty-panel nado-empty-panel--compact">
              <span className="nado-eyebrow">비어 있음</span>
              <h2>단어장 항목이 아직 없어요</h2>
              <p>분석 결과에서 저장한 단어와 표현이 이곳에 쌓입니다.</p>
            </div>

            <section
              className="nado-vocabulary-preview"
              aria-label="단어장 미리보기"
            >
              <header className="nado-section-header">
                <div>
                  <span className="nado-eyebrow">Preview</span>
                  <h2>저장 후 이렇게 정리돼요</h2>
                </div>
                <span>로그인 전 미리보기</span>
              </header>

              <div className="nado-vocabulary-list">
                {vocabularyPreviewItems.map((item) => (
                  <article className="nado-vocabulary-item" key={item.term}>
                    <header>
                      <div>
                        <span className="nado-vocabulary-type">
                          {item.type}
                        </span>
                        <h2>{item.term}</h2>
                      </div>
                      <time>{item.date}</time>
                    </header>
                    <div
                      className="nado-vocabulary-meaning-list"
                      aria-label={`${item.term} 뜻`}
                    >
                      {item.meanings.map((meaning) => (
                        <span className="nado-vocabulary-meaning" key={meaning}>
                          {meaning}
                        </span>
                      ))}
                    </div>
                    <footer className="nado-vocabulary-item__footer">
                      <span>{item.detail}</span>
                      <Button disabled size="sm" variant="secondary">
                        삭제
                      </Button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
