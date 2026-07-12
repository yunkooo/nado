import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
  DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
  MAX_ANALYSIS_DAILY_LIMIT,
  readAnalysisDailyLimit,
} from "./analysisLimits.js";

describe("analysis limit config", () => {
  it("keeps analysis limits disabled when daily limit env values are absent", () => {
    expect(
      readAnalysisDailyLimit(undefined, {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(0);
    expect(
      readAnalysisDailyLimit(undefined, {
        defaultValue: DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
        name: "NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(0);
  });

  it("allows an explicit positive limit when it is configured intentionally", () => {
    expect(
      readAnalysisDailyLimit("3", {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(3);

    expect(
      readAnalysisDailyLimit(String(MAX_ANALYSIS_DAILY_LIMIT), {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      }),
    ).toBe(MAX_ANALYSIS_DAILY_LIMIT);
  });

  it.each(["oops", "-1", "1.5", String(MAX_ANALYSIS_DAILY_LIMIT + 1)])(
    "rejects an invalid daily limit env value %s",
    (value) => {
      expect(() =>
        readAnalysisDailyLimit(value, {
          defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
          name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
        }),
      ).toThrow(
        `NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT must be a non-negative integer no greater than ${MAX_ANALYSIS_DAILY_LIMIT}.`,
      );
    },
  );
});
