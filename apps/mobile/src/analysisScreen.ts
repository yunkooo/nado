import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";

export const INITIAL_ANALYSIS_TEXT = "";
export const ANALYSIS_INPUT_ACCESSIBILITY_LABEL = "분석할 영어 문장";
export const ANALYSIS_INPUT_PLACEHOLDER_TEXT =
  "영어 한 문장 또는 짧은 문단을 입력해 주세요.";
export const ANALYSIS_PRIVACY_HELPER_TEXT =
  "입력한 문장은 AI 분석을 위해 전송되며, 단어장에는 원문 문장을 저장하지 않습니다.";

export const mobileTabs = [
  { disabled: false, key: "analysis", label: "분석" },
  { disabled: false, key: "vocabulary", label: "단어장" },
  { disabled: false, key: "review", label: "복습" },
] as const;

export type MobileTabKey = (typeof mobileTabs)[number]["key"];

export const mobileVocabularyItems = [
  {
    date: "2026.06.09",
    id: "vocabulary-wondering",
    meanings: ["궁금해하다", "정중하게 질문을 꺼내는 표현"],
    term: "wondering",
    typeLabel: "word",
  },
  {
    date: "2026.06.09",
    id: "vocabulary-help",
    meanings: ["도와주다", "상대에게 도움을 요청할 때 쓰는 동사"],
    term: "help",
    typeLabel: "word",
  },
] as const;

export const mobileReviewDirections = [
  "영어 → 한국어",
  "한국어 → 영어",
] as const;

export const mobileReviewFlashcard = {
  answer: "궁금해하다",
  eyebrow: "Flashcard",
  term: "wondering",
} as const;

export function getAnalysisComposerState(text: string) {
  const hasInput = text.trim().length > 0;

  return {
    countLabel: `${text.length} / ${MAX_ANALYSIS_TEXT_LENGTH}`,
    hasInput,
    helperText: ANALYSIS_PRIVACY_HELPER_TEXT,
    placeholderText: ANALYSIS_INPUT_PLACEHOLDER_TEXT,
    isSubmitDisabled: !hasInput,
  };
}

export function shouldShowAnalysisResult(
  text: string,
  submittedText: string | null,
) {
  const currentText = text.trim();

  return currentText.length > 0 && currentText === submittedText;
}
