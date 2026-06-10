import type { VocabularyPanelState } from "./vocabularyViewState";

type VocabularyPanelProps = {
  message: string | null;
  state: Exclude<VocabularyPanelState, "list">;
};

const panelCopy = {
  auth_loading: {
    eyebrow: "확인 중",
    message: "저장한 단어를 보여주기 전에 로그인 상태를 확인하고 있어요.",
    title: "로그인 상태를 확인하고 있어요",
  },
  auth_required: {
    eyebrow: "로그인 필요",
    message: "Google 로그인 후 저장한 단어와 표현을 이곳에서 확인해 주세요.",
    title: "로그인 후 단어장을 이용할 수 있어요",
  },
  empty: {
    eyebrow: "저장 전",
    message: "분석 결과에서 단어와 표현을 저장하면 이곳에 모을게요.",
    title: "저장된 단어가 아직 없어요",
  },
  vocabulary_loading: {
    eyebrow: "불러오는 중",
    message: "저장한 단어와 표현을 서버에서 가져오고 있어요.",
    title: "단어장을 불러오고 있어요",
  },
};

export function VocabularyPanel({ message, state }: VocabularyPanelProps) {
  if (state === "error") {
    return (
      <div className="nado-empty-panel nado-empty-panel--compact" role="alert">
        <span className="nado-eyebrow">연결 오류</span>
        <h2>단어장을 불러오지 못했어요</h2>
        <p>{message}</p>
      </div>
    );
  }

  const copy = panelCopy[state];

  return (
    <div
      className="nado-empty-panel nado-empty-panel--compact"
      role={isLoadingPanelState(state) ? "status" : undefined}
    >
      <span className="nado-eyebrow">{copy.eyebrow}</span>
      <h2>{copy.title}</h2>
      <p>{copy.message}</p>
    </div>
  );
}

function isLoadingPanelState(state: VocabularyPanelProps["state"]) {
  return state === "auth_loading" || state === "vocabulary_loading";
}

type VocabularySummaryProps = {
  isAvailable: boolean;
  itemCount: number;
};

export function VocabularySummary({
  isAvailable,
  itemCount,
}: VocabularySummaryProps) {
  return (
    <section className="nado-vocabulary-summary" aria-label="단어장 요약">
      <article className="nado-vocabulary-summary__item">
        <span>저장 항목</span>
        <strong>{isAvailable ? String(itemCount) : "-"}</strong>
      </article>
    </section>
  );
}
