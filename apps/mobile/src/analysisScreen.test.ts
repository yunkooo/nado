import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import {
  ANALYSIS_INPUT_PLACEHOLDER_TEXT,
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  ANALYSIS_PRIVACY_HELPER_TEXT,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  mobileReviewCards,
  mobileReviewDirections,
  mobileReviewFlashcard,
  mobileTabs,
  mobileVocabularyItems,
  mobileVocabularySummary,
  shouldShowAnalysisResult,
} from "./analysisScreen";

describe("mobile analysis screen state", () => {
  it("keeps the MVP tabs in product order", () => {
    expect(mobileTabs.map((tab) => tab.label)).toEqual([
      "분석",
      "단어장",
      "복습",
    ]);
  });

  it("starts without a seeded analysis text", () => {
    expect(INITIAL_ANALYSIS_TEXT).toBe("");
  });

  it("enables every primary tab for publishing navigation", () => {
    expect(mobileTabs).toEqual([
      { disabled: false, key: "analysis", label: "분석" },
      { disabled: false, key: "vocabulary", label: "단어장" },
      { disabled: false, key: "review", label: "복습" },
    ]);
  });

  it("matches the website vocabulary preview content", () => {
    expect(mobileVocabularyItems.map((item) => item.term)).toEqual([
      "wondering",
      "take a look",
      "issue",
    ]);
    expect(mobileVocabularySummary).toEqual({
      label: "저장 항목",
      value: "3",
    });
    expect(mobileVocabularyItems[0]).toEqual({
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
    });
  });

  it("matches the website review publishing content", () => {
    expect(mobileReviewDirections).toEqual(["영어 → 한국어", "한국어 → 영어"]);
    expect(mobileReviewCards.map((card) => card.term)).toEqual([
      "wondering",
      "take a look",
      "issue",
    ]);
    expect(mobileReviewFlashcard).toEqual({
      answer: "궁금해하다",
      eyebrow: "Flashcard",
      meta: "1 / 3",
      note: "정중하게 질문을 꺼내는 표현",
      term: "wondering",
    });
  });

  it("exposes a stable input accessibility label", () => {
    expect(ANALYSIS_INPUT_ACCESSIBILITY_LABEL).toBe("분석할 영어 문장");
  });

  it("disables analysis and keeps the AI transfer notice for blank input", () => {
    expect(getAnalysisComposerState("   ")).toEqual({
      countLabel: `0 / ${MAX_ANALYSIS_TEXT_LENGTH}`,
      hasInput: false,
      helperText: ANALYSIS_PRIVACY_HELPER_TEXT,
      placeholderText: ANALYSIS_INPUT_PLACEHOLDER_TEXT,
      isSubmitDisabled: true,
    });
  });

  it("enables analysis and shows the AI transfer notice for text input", () => {
    expect(getAnalysisComposerState("I need help.")).toEqual({
      countLabel: `12 / ${MAX_ANALYSIS_TEXT_LENGTH}`,
      hasInput: true,
      helperText: ANALYSIS_PRIVACY_HELPER_TEXT,
      placeholderText: ANALYSIS_INPUT_PLACEHOLDER_TEXT,
      isSubmitDisabled: false,
    });
  });

  it("counts normalized code points for compatible Unicode text", () => {
    expect(getAnalysisComposerState("  𝐀  ")).toMatchObject({
      countLabel: `1 / ${MAX_ANALYSIS_TEXT_LENGTH}`,
      hasInput: true,
      isSubmitDisabled: false,
    });
  });

  it("does not show analysis result before submit", () => {
    expect(shouldShowAnalysisResult("I need help.", null)).toBe(false);
  });

  it("shows analysis result after submitting the current text", () => {
    expect(shouldShowAnalysisResult("I need help.", "I need help.")).toBe(true);
  });

  it("hides the previous result when input changes after submit", () => {
    expect(shouldShowAnalysisResult("I need more help.", "I need help.")).toBe(
      false,
    );
  });
});
