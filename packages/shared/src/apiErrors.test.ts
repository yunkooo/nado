import { describe, expect, it } from "vitest";
import { ANALYSIS_ERROR_MESSAGES } from "./analysisContracts";
import {
  apiErrorResponseSchema,
  errorCodeSchema,
  readApiErrorDetail,
  readApiErrorMessage,
} from "./apiErrors";

describe("api error response helpers", () => {
  it("keeps the public error code contract", () => {
    expect(errorCodeSchema.parse("analysis_timeout")).toBe("analysis_timeout");
    expect(errorCodeSchema.safeParse("unsupported_error").success).toBe(false);
  });

  it("parses traceable retryable analysis errors", () => {
    expect(
      apiErrorResponseSchema.parse({
        error: {
          code: "analysis_failed",
          message: ANALYSIS_ERROR_MESSAGES.analysis_failed,
          requestId: "request-1",
          retryable: true,
        },
      }),
    ).toEqual({
      error: {
        code: "analysis_failed",
        message: ANALYSIS_ERROR_MESSAGES.analysis_failed,
        requestId: "request-1",
        retryable: true,
      },
    });
  });

  it("falls back to the analysis message when an error payload is malformed", () => {
    expect(
      readApiErrorDetail(null, ANALYSIS_ERROR_MESSAGES.analysis_failed),
    ).toEqual({
      code: "unknown_error",
      message: ANALYSIS_ERROR_MESSAGES.analysis_failed,
    });
  });

  it("reads API error messages without requiring app-local helpers", () => {
    expect(
      readApiErrorMessage(
        {
          error: {
            code: "unauthorized",
            message: "로그인이 필요해요.",
          },
        },
        "fallback",
      ),
    ).toBe("로그인이 필요해요.");
  });

  it("keeps message-only error payloads backwards compatible", () => {
    expect(
      readApiErrorMessage(
        {
          error: {
            message: "단어장 항목을 찾을 수 없습니다.",
          },
        },
        "fallback",
      ),
    ).toBe("단어장 항목을 찾을 수 없습니다.");
  });
});
