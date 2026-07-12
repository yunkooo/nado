import { describe, expect, it, vi } from "vitest";
import { executeAnalysisRequest } from "./executeAnalysisRequest.js";

const input = {
  model: "gpt-5.4-mini" as const,
  text: "Hello.",
};

describe("executeAnalysisRequest", () => {
  it("stops before the provider when usage is rate limited", async () => {
    const analyze = vi.fn();
    const stages: string[] = [];

    await expect(
      executeAnalysisRequest({
        analyzeService: { analyze },
        analysisUsageService: {
          consume: async () => ({
            limit: 3,
            ok: false,
            retryAfterSeconds: 60,
            used: 3,
          }),
        },
        input,
        resolveUsageIdentity: async () => ({
          ipHash: null,
          userId: "user-1",
        }),
        runStage: async (stage, operation) => {
          stages.push(stage);
          return operation();
        },
      }),
    ).resolves.toEqual({
      kind: "rate_limited",
      retryAfterSeconds: 60,
      usageIdentityKind: "authenticated",
    });
    expect(analyze).not.toHaveBeenCalled();
    expect(stages).toEqual(["usageIdentity", "usageConsume"]);
  });

  it("validates successful provider output before returning it", async () => {
    const analysis = {
      reason: "영어 학습 문장입니다.",
      status: "not_analyzable" as const,
    };
    const stages: string[] = [];

    await expect(
      executeAnalysisRequest({
        analyzeService: { analyze: async () => analysis },
        analysisUsageService: {
          consume: async () => ({
            limit: null,
            ok: true,
            remaining: null,
            used: 1,
          }),
        },
        input,
        resolveUsageIdentity: async () => ({
          ipHash: "hashed-ip",
          userId: null,
        }),
        runStage: async (stage, operation) => {
          stages.push(stage);
          return operation();
        },
      }),
    ).resolves.toEqual({
      analysis,
      kind: "success",
      usageIdentityKind: "anonymous",
    });
    expect(stages).toEqual([
      "usageIdentity",
      "usageConsume",
      "analyze",
      "responseValidation",
    ]);
  });
});
