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
    id: "mock-wondering",
    meanings: [
      {
        meaning: "궁금해하다",
        note: "정중하게 질문을 꺼내는 표현",
      },
      {
        meaning: "~인지 알고 싶다",
        note: "if 절과 함께 부드럽게 요청할 때 자주 쓰입니다.",
      },
    ],
    term: "wondering",
    typeLabel: "word",
  },
  {
    date: "2026.06.09",
    id: "mock-take-a-look",
    meanings: [
      {
        meaning: "한번 살펴보다",
        note: "문제나 자료를 가볍게 확인해 달라고 요청할 때 씁니다.",
      },
    ],
    term: "take a look",
    typeLabel: "phrase",
  },
  {
    date: "2026.06.09",
    id: "mock-issue",
    meanings: [
      {
        meaning: "문제, 쟁점",
        note: "bug보다 넓은 의미로 상황이나 논의할 점을 가리킵니다.",
      },
    ],
    term: "issue",
    typeLabel: "word",
  },
] as const;

export const mobileVocabularySummary = {
  label: "저장 항목",
  value: String(mobileVocabularyItems.length),
} as const;

export const mobileReviewDirections = [
  "영어 → 한국어",
  "한국어 → 영어",
] as const;

export const mobileReviewCards = [
  {
    answer: "궁금해하다",
    eyebrow: "Flashcard",
    meta: "1 / 3",
    note: "정중하게 질문을 꺼내는 표현",
    term: "wondering",
  },
  {
    answer: "한번 살펴보다",
    eyebrow: "Flashcard",
    meta: "2 / 3",
    note: "문제나 자료를 가볍게 확인해 달라고 요청할 때 씁니다.",
    term: "take a look",
  },
  {
    answer: "문제, 쟁점",
    eyebrow: "Flashcard",
    meta: "3 / 3",
    note: "bug보다 넓은 의미로 상황이나 논의할 점을 가리킵니다.",
    term: "issue",
  },
] as const;

export const mobileReviewFlashcard = mobileReviewCards[0];

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
