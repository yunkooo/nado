import { describe, expect, it } from "vitest";
import { DEFAULT_ANALYSIS_MODEL_ID } from "@nado/shared/analysis-input";
import { parseAnalyzeInput } from "./analyzeInput.js";

describe("parseAnalyzeInput", () => {
  it("accepts a trimmed English input", () => {
    expect(parseAnalyzeInput({ text: "  I am learning English.  " })).toEqual({
      model: DEFAULT_ANALYSIS_MODEL_ID,
      ok: true,
      text: "I am learning English.",
    });
  });

  it("rejects blank input", () => {
    expect(parseAnalyzeInput({ text: " " })).toEqual({
      code: "invalid_input",
      issues: ["analysis.text.required"],
      ok: false,
    });
  });

  it("rejects unsupported hidden characters", () => {
    expect(parseAnalyzeInput({ text: "I\u200B leave home." })).toEqual({
      code: "invalid_input",
      issues: ["analysis.text.unsupported_characters"],
      ok: false,
    });
  });
});
