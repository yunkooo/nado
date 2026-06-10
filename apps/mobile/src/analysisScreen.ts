import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
} from "@nado/shared";

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

export function getAnalysisComposerState(text: string) {
  const inputLength = countAnalysisTextCharacters(text);
  const hasInput = inputLength > 0;

  return {
    countLabel: `${inputLength} / ${MAX_ANALYSIS_TEXT_LENGTH}`,
    hasInput,
    helperText: ANALYSIS_PRIVACY_HELPER_TEXT,
    placeholderText: ANALYSIS_INPUT_PLACEHOLDER_TEXT,
    isSubmitDisabled: !hasInput,
  };
}
