import { describe, expect, it } from "vitest";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  isLikelyEnglishLearningText,
  normalizeVocabularyTerm,
  parseAnalyzeRequest,
} from "./index";

describe("parseAnalyzeRequest", () => {
  it("trims valid analysis text", () => {
    expect(
      parseAnalyzeRequest({ text: "  I was wondering if you could help.  " }),
    ).toEqual({
      text: "I was wondering if you could help.",
    });
  });

  it("rejects blank analysis text", () => {
    expect(() => parseAnalyzeRequest({ text: "   " })).toThrow(
      "analysis.text.required",
    );
  });

  it("rejects text longer than the MVP limit", () => {
    expect(() =>
      parseAnalyzeRequest({ text: "a".repeat(MAX_ANALYSIS_TEXT_LENGTH + 1) }),
    ).toThrow("analysis.text.too_long");
  });
});

describe("normalizeVocabularyTerm", () => {
  it("normalizes case and repeated spaces", () => {
    expect(normalizeVocabularyTerm("  Wonder   If  ")).toBe("wonder if");
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
});
