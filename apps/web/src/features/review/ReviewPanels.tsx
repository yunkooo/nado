import type { VocabularyPanelState } from "../vocabulary/vocabularyViewState";

type ReviewPanelProps = {
  message: string | null;
  state: Exclude<VocabularyPanelState, "list">;
};

const panelCopy = {
  auth_loading: {
    eyebrow: "확인 중",
    message: "복습 카드를 불러오기 전에 로그인 상태를 먼저 확인합니다.",
    title: "로그인 상태를 확인하고 있어요",
  },
  auth_required: {
    eyebrow: "로그인 필요",
    message: "Google 로그인 후 단어장에 저장한 항목으로 복습을 이어가 주세요.",
    title: "로그인 후 복습을 이용할 수 있어요",
  },
  empty: {
    eyebrow: "저장 전",
    message: "분석 결과에서 단어를 저장하면 바로 복습 카드로 이어집니다.",
    title: "복습할 단어가 없어요",
  },
  loading: {
    eyebrow: "불러오는 중",
    message: "저장한 단어로 복습 카드를 준비하고 있어요.",
    title: "복습 카드를 불러오고 있어요",
  },
};

export function ReviewPanel({ message, state }: ReviewPanelProps) {
  if (state === "error") {
    return (
      <div className="nado-empty-panel" role="alert">
        <span className="nado-eyebrow">연결 오류</span>
        <h2>복습 단어를 불러오지 못했어요</h2>
        <p>{message}</p>
      </div>
    );
  }

  const copy = panelCopy[state];

  return (
    <div
      className="nado-empty-panel"
      role={state === "loading" ? "status" : undefined}
    >
      <span className="nado-eyebrow">{copy.eyebrow}</span>
      <h2>{copy.title}</h2>
      <p>{copy.message}</p>
    </div>
  );
}
