import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
} from "@nado/shared/analysis-input";

export const INITIAL_ANALYSIS_TEXT = "";
export const ANALYSIS_INPUT_ACCESSIBILITY_LABEL = "분석할 영어 문장";
export const ANALYSIS_INPUT_PLACEHOLDER_TEXT =
  "영어 한 문장 또는 짧은 문단을 입력해 주세요.";
export const ANALYSIS_PRIVACY_HELPER_TEXT =
  "입력문은 분석에만 사용되며 저장되지 않습니다.";

export const mobileTabs = [
  { disabled: false, key: "analysis", label: "분석" },
  { disabled: false, key: "vocabulary", label: "단어장" },
  { disabled: false, key: "review", label: "복습" },
] as const;

const MOBILE_DESIGN_DEMO_TAB = {
  disabled: false,
  key: "designDemo",
  label: "디자인",
} as const;

export type MobileTabKey =
  | (typeof mobileTabs)[number]["key"]
  | typeof MOBILE_DESIGN_DEMO_TAB.key;

export function getMobileTabs({ showDesignDemo }: { showDesignDemo: boolean }) {
  return showDesignDemo ? [...mobileTabs, MOBILE_DESIGN_DEMO_TAB] : mobileTabs;
}

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

export function getAnalysisSourceSampleState(text: string) {
  return {
    countLabel: `${countAnalysisTextCharacters(text)} / ${MAX_ANALYSIS_TEXT_LENGTH}`,
    text,
  };
}

export function resolveAnalysisInputAfterSuccess(
  currentText: string,
  submittedText: string,
) {
  return currentText === submittedText ? "" : currentText;
}
