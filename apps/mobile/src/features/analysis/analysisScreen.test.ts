import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_TEXT_LENGTH } from "@nado/shared";
import {
  ANALYSIS_INPUT_PLACEHOLDER_TEXT,
  ANALYSIS_INPUT_ACCESSIBILITY_LABEL,
  ANALYSIS_PRIVACY_HELPER_TEXT,
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  getAnalysisSourceSampleState,
  getMobileTabs,
  mobileTabs,
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

  it("keeps the mobile design demo tab behind an explicit opt-in", () => {
    expect(getMobileTabs({ showDesignDemo: false })).toEqual(mobileTabs);
    expect(getMobileTabs({ showDesignDemo: true })).toEqual([
      ...mobileTabs,
      { disabled: false, key: "designDemo", label: "디자인" },
    ]);
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

  it("formats the analyzed source text count for the result card", () => {
    expect(
      getAnalysisSourceSampleState("What to avoid when organizing state"),
    ).toEqual({
      countLabel: `35 / ${MAX_ANALYSIS_TEXT_LENGTH}`,
      text: "What to avoid when organizing state",
    });
  });

  it("does not expose mock vocabulary or review data", async () => {
    const screenModule = await import("./analysisScreen");

    expect("mobileVocabularyItems" in screenModule).toBe(false);
    expect("mobileReviewCards" in screenModule).toBe(false);
  });
});
