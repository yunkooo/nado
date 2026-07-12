import { describe, expect, it } from "vitest";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  MAX_ANALYSIS_TEXT_LENGTH,
  analysisModelIdSchema,
  analyzeRequestSchema,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  isLikelyEnglishLearningText,
  isOpenRouterAnalysisModelId,
  normalizeAnalysisText,
  parseAnalyzeRequest,
} from "./analysisInput";

describe("analyzeRequestSchema", () => {
  it("keeps the MVP analysis input limit at 200 characters", () => {
    expect(MAX_ANALYSIS_TEXT_LENGTH).toBe(200);
  });

  it("trims valid analysis text", () => {
    expect(
      parseAnalyzeRequest({
        text: "  I was wondering if you could help.  ",
      }),
    ).toEqual({
      model: DEFAULT_ANALYSIS_MODEL_ID,
      text: "I was wondering if you could help.",
    });
  });

  it("defines Kimi as the default analysis model and exposes all selectable models", () => {
    expect(DEFAULT_ANALYSIS_MODEL_ID).toBe("moonshotai/kimi-k2.7-code");
    expect(ANALYSIS_MODELS.map((model) => model.label)).toEqual([
      "Kimi K2.7 Code",
      "GLM 5.2",
      "GPT 5.4 mini",
    ]);
    expect(isOpenRouterAnalysisModelId("moonshotai/kimi-k2.7-code")).toBe(true);
    expect(isOpenRouterAnalysisModelId("z-ai/glm-5.2")).toBe(true);
    expect(isOpenRouterAnalysisModelId("gpt-5.4-mini")).toBe(false);
  });

  it("accepts supported analysis model ids", () => {
    expect(
      analyzeRequestSchema.parse({
        model: "z-ai/glm-5.2",
        text: "I was wondering if you could help.",
      }),
    ).toEqual({
      model: "z-ai/glm-5.2",
      text: "I was wondering if you could help.",
    });
  });

  it("rejects unsupported analysis model ids", () => {
    expect(() =>
      analyzeRequestSchema.parse({
        model: "unknown/model",
        text: "I was wondering if you could help.",
      }),
    ).toThrow();
    expect(analysisModelIdSchema.safeParse("unknown/model").success).toBe(
      false,
    );
  });

  it("rejects blank analysis text", () => {
    expect(() => analyzeRequestSchema.parse({ text: "   " })).toThrow(
      "analysis.text.required",
    );
  });

  it("rejects text longer than the MVP limit", () => {
    expect(() =>
      analyzeRequestSchema.parse({
        text: "a".repeat(MAX_ANALYSIS_TEXT_LENGTH + 1),
      }),
    ).toThrow("analysis.text.too_long");
  });

  it("normalizes compatible unicode before validating text", () => {
    expect(analyzeRequestSchema.parse({ text: "  Ｉ leave home．  " })).toEqual(
      {
        model: DEFAULT_ANALYSIS_MODEL_ID,
        text: "I leave home.",
      },
    );
  });

  it("rejects invisible format characters", () => {
    expect(() =>
      analyzeRequestSchema.parse({ text: "I\u200B leave home." }),
    ).toThrow("analysis.text.unsupported_characters");
  });

  it("rejects unsupported symbols even when the text is short", () => {
    expect(() =>
      analyzeRequestSchema.parse({ text: "I leave home 💣" }),
    ).toThrow("analysis.text.unsupported_characters");
  });
});

describe("analysis text helpers", () => {
  it("counts normalized Unicode code points instead of UTF-16 units", () => {
    const normalized = normalizeAnalysisText("  Ｉ leave home．  ");

    expect(normalized).toBe("I leave home.");
    expect(countAnalysisTextCharacters("  Ｉ leave home．  ")).toBe(
      Array.from(normalized).length,
    );
  });

  it("detects control and format characters as unsupported", () => {
    expect(hasUnsupportedAnalysisTextCharacters("I\u202E leave home.")).toBe(
      true,
    );
    expect(hasUnsupportedAnalysisTextCharacters("I leave home.")).toBe(false);
  });
});

describe("isLikelyEnglishLearningText", () => {
  it("accepts ordinary English sentences", () => {
    expect(
      isLikelyEnglishLearningText("I was wondering if you could help me."),
    ).toBe(true);
  });

  it("rejects mostly numeric or symbolic input", () => {
    expect(isLikelyEnglishLearningText("1234567890 !!!")).toBe(false);
  });

  it("rejects English-looking text with unsupported hidden characters", () => {
    expect(isLikelyEnglishLearningText("I\u200B leave home.")).toBe(false);
  });
});
