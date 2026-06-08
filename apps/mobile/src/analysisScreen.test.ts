import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import {
  ANALYSIS_INPUT_PLACEHOLDER_TEXT,
  ANALYSIS_PRIVACY_HELPER_TEXT,
  getAnalysisComposerState,
  mobileTabs,
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

  it("disables analysis and keeps the AI transfer notice for blank input", () => {
    expect(getAnalysisComposerState("   ")).toEqual({
      countLabel: `3 / ${MAX_ANALYSIS_TEXT_LENGTH}`,
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
