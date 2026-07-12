import { describe, expect, it } from "vitest";
import { parseAnalyzeInput } from "./analyzeInput.js";

describe("parseAnalyzeInput", () => {
  it("accepts a trimmed English input", () => {
    expect(parseAnalyzeInput({ text: "  I am learning English.  " })).toEqual({
      model: "moonshotai/kimi-k2.7-code",
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
