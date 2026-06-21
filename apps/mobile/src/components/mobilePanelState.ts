import type { MobileAuthStateStatus } from "../auth/authState";
import type { MobileVocabularyState } from "../features/vocabulary/mobileVocabularyState";

export type MobilePanelState =
  | "auth_required"
  | "empty"
  | "error"
  | "list"
  | "loading";

export type MobilePanelType = "review" | "vocabulary";

export function getMobileVocabularyPanelState(
  authStatus: MobileAuthStateStatus,
  vocabularyState: MobileVocabularyState,
): MobilePanelState {
  if (authStatus === "loading" || vocabularyState.status === "loading") {
    return "loading";
  }

  if (authStatus !== "authenticated") {
    return "auth_required";
  }

  if (vocabularyState.status === "error") {
    return "error";
  }

  return vocabularyState.items.length > 0 ? "list" : "empty";
}

export function getMobileStatePanelCopy(
  type: MobilePanelType,
  state: Exclude<MobilePanelState, "list">,
  message: string | null,
) {
  if (state === "error") {
    return {
      eyebrow: "연결 오류",
      message:
        message ??
        (type === "vocabulary"
          ? "단어장을 불러오지 못했어요."
          : "복습 단어를 불러오지 못했어요."),
      title:
        type === "vocabulary"
          ? "단어장을 불러오지 못했어요"
          : "복습 단어를 불러오지 못했어요",
    };
  }

  if (state === "loading") {
    return {
      eyebrow: "불러오는 중",
      message:
        type === "vocabulary"
          ? "저장한 단어와 표현을 가져오고 있어요."
          : "저장한 단어로 복습 카드를 준비하고 있어요.",
      title:
        type === "vocabulary"
          ? "단어장을 불러오고 있어요"
          : "복습 카드를 불러오고 있어요",
    };
  }

  if (state === "empty") {
    return {
      eyebrow: "저장 전",
      message:
        type === "vocabulary"
          ? "분석 결과에서 단어와 표현을 저장하면 이곳에 모을게요."
          : "분석 결과에서 단어를 저장하면 바로 복습 카드로 이어집니다.",
      title:
        type === "vocabulary"
          ? "저장된 단어가 아직 없어요"
          : "복습할 단어가 없어요",
    };
  }

  return {
    eyebrow: "로그인 필요",
    message:
      type === "vocabulary"
        ? "Google 로그인 후 저장한 단어와 표현을 이곳에서 확인해 주세요."
        : "Google 로그인 후 단어장에 저장한 항목으로 복습을 이어가 주세요.",
    title:
      type === "vocabulary"
        ? "로그인 후 단어장을 이용할 수 있어요"
        : "로그인 후 복습을 이용할 수 있어요",
  };
}
