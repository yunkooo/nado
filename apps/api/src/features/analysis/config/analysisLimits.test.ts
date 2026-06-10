import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
  DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
  readAnalysisDailyLimit,
} from "./analysisLimits.js";

describe("analysis limit config", () => {
  it("uses conservative defaults when daily limit env values are absent", () => {
    expect(
      readAnalysisDailyLimit(undefined, {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT);
    expect(
      readAnalysisDailyLimit(undefined, {
        defaultValue: DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
        name: "NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT);
  });

  it("allows an explicit zero limit only when it is configured intentionally", () => {
    expect(
      readAnalysisDailyLimit("0", {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(0);
  });

  it("rejects malformed daily limit env values", () => {
    expect(() =>
      readAnalysisDailyLimit("oops", {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      }),
    ).toThrow(
      "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT must be a non-negative integer.",
    );
  });
});
