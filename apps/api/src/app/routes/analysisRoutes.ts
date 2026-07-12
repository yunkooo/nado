import { Router } from "express";
import { ANALYSIS_ERROR_MESSAGES } from "@nado/shared/analysis";
import { isLikelyEnglishLearningText } from "@nado/shared/analysis-input";
import {
  executeAnalysisRequest,
  type AnalysisRequestStage,
} from "../../features/analysis/executeAnalysisRequest.js";
import { parseAnalyzeInput } from "../../features/analysis/analyzeInput.js";
import type {
  AnalysisUsageService,
  AnalyzeService,
} from "../../features/analysis/analysisTypes.js";
import { resolveAnalyzeUsageIdentity } from "../../features/analysis/usageIdentity.js";
import type { AuthService } from "../../features/auth/authService.js";
import {
  BadGatewayError,
  ServiceUnavailableError,
  isHttpError,
} from "../../shared/errors/httpErrors.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { readRequestIp } from "../../shared/http/requestIp.js";
import { readRequestId } from "../../shared/http/requestContext.js";

export type AnalysisRoutesDependencies = {
  analysisUsageService: AnalysisUsageService;
  analysisTimingLogger?: AnalysisTimingLogger;
  analyzeService: AnalyzeService;
  authService: AuthService;
  usageIpHashSalt: string;
};

export type AnalysisTimingLogEntry = {
  errorCode?: string;
  model: string | null;
  outcome:
    | "error"
    | "invalid_input"
    | "not_analyzable"
    | "rate_limited"
    | "success";
  route: "POST /api/analyze";
  status?: "analyzable" | "not_analyzable";
  statusCode: number;
  textLength: number | null;
  timingsMs: {
    analyze?: number;
    responseValidation?: number;
    total: number;
    usageConsume?: number;
    usageIdentity?: number;
  };
  requestId: string;
  usageIdentity?: "anonymous" | "authenticated";
};

export type AnalysisTimingLogger = (entry: AnalysisTimingLogEntry) => void;

export function createAnalysisRoutes({
  analysisUsageService,
  analysisTimingLogger,
  analyzeService,
  authService,
  usageIpHashSalt,
}: AnalysisRoutesDependencies) {
  const router = Router();

  router.post(
    "/analyze",
    asyncRoute(async (request, response) => {
      const routeTiming = createAnalysisRouteTiming();
      const requestId = readRequestId(response);
      const input = parseAnalyzeInput(request.body as unknown);

      if (!input.ok) {
        logAnalysisTiming(analysisTimingLogger, {
          ...routeTiming.snapshot(),
          model: null,
          outcome: "invalid_input",
          requestId,
          route: "POST /api/analyze",
          statusCode: 400,
          textLength: null,
        });

        return response.status(400).json({
          error: {
            code: input.code,
            issues: input.issues,
            message:
              "Text must be a non-empty English sentence up to 200 supported characters.",
            requestId,
            retryable: false,
          },
        });
      }

      if (!isLikelyEnglishLearningText(input.text)) {
        logAnalysisTiming(analysisTimingLogger, {
          ...routeTiming.snapshot(),
          model: input.model,
          outcome: "not_analyzable",
          requestId,
          route: "POST /api/analyze",
          status: "not_analyzable",
          statusCode: 200,
          textLength: input.text.length,
        });

        return response.json({
          reason: "영어 문장으로 분석하기 어려운 입력입니다.",
          status: "not_analyzable",
        });
      }

      let usageIdentityStartedAt: number | null = null;
      let usageConsumeStartedAt: number | null = null;
      let analyzeStartedAt: number | null = null;
      let validationStartedAt: number | null = null;
      let usageIdentityKind: "anonymous" | "authenticated" | undefined;
      const setStageStartedAt = (
        stage: AnalysisRequestStage,
        startedAt: number,
      ) => {
        if (stage === "usageIdentity") {
          usageIdentityStartedAt = startedAt;
        } else if (stage === "usageConsume") {
          usageConsumeStartedAt = startedAt;
        } else if (stage === "analyze") {
          analyzeStartedAt = startedAt;
        } else {
          validationStartedAt = startedAt;
        }
      };

      try {
        const analysisResult = await executeAnalysisRequest({
          analysisUsageService,
          analyzeService,
          input,
          onUsageIdentityResolved: (kind) => {
            usageIdentityKind = kind;
          },
          resolveUsageIdentity: () =>
            resolveAnalyzeUsageIdentity({
              authService,
              authorization: request.header("Authorization"),
              clientIp: readRequestIp(request),
              usageIpHashSalt,
            }),
          runStage: async (stage, operation) => {
            const startedAt = routeTiming.now();
            setStageStartedAt(stage, startedAt);

            const result = await operation();
            routeTiming.setTiming(stage, startedAt);
            return result;
          },
        });
        usageIdentityKind = analysisResult.usageIdentityKind;

        if (analysisResult.kind === "rate_limited") {
          logAnalysisTiming(analysisTimingLogger, {
            ...routeTiming.snapshot(),
            model: input.model,
            outcome: "rate_limited",
            requestId,
            route: "POST /api/analyze",
            statusCode: 429,
            textLength: input.text.length,
            usageIdentity: usageIdentityKind,
          });

          return response
            .set("Retry-After", String(analysisResult.retryAfterSeconds))
            .status(429)
            .json({
              error: {
                code: "rate_limited",
                message: "오늘 사용할 수 있는 분석 횟수를 모두 사용했어요.",
                requestId,
                retryable: false,
              },
            });
        }

        logAnalysisTiming(analysisTimingLogger, {
          ...routeTiming.snapshot(),
          model: input.model,
          outcome: "success",
          requestId,
          route: "POST /api/analyze",
          status: analysisResult.analysis.status,
          statusCode: 200,
          textLength: input.text.length,
          usageIdentity: usageIdentityKind,
        });

        return response.json(analysisResult.analysis);
      } catch (error) {
        if (usageIdentityStartedAt !== null) {
          routeTiming.setTimingIfUnset("usageIdentity", usageIdentityStartedAt);
        }

        if (usageConsumeStartedAt !== null) {
          routeTiming.setTimingIfUnset("usageConsume", usageConsumeStartedAt);
        }

        if (analyzeStartedAt !== null) {
          routeTiming.setTimingIfUnset("analyze", analyzeStartedAt);
        }

        if (validationStartedAt !== null) {
          routeTiming.setTimingIfUnset(
            "responseValidation",
            validationStartedAt,
          );
        }

        const httpError = toAnalysisHttpError(error, {
          analyzeStarted: analyzeStartedAt !== null,
          validationStarted: validationStartedAt !== null,
        });

        logAnalysisTiming(analysisTimingLogger, {
          ...routeTiming.snapshot(),
          errorCode: httpError.code,
          model: input.model,
          outcome: "error",
          requestId,
          route: "POST /api/analyze",
          statusCode: httpError.status,
          textLength: input.text.length,
          usageIdentity: usageIdentityKind,
        });

        throw httpError;
      }
    }),
  );

  return router;
}

function toAnalysisHttpError(
  error: unknown,
  stages: { analyzeStarted: boolean; validationStarted: boolean },
) {
  if (isHttpError(error)) {
    return error;
  }

  if (!stages.analyzeStarted) {
    return new ServiceUnavailableError(
      "analysis_dependency_unavailable",
      "분석 준비 서비스를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
      { cause: error, retryable: true },
    );
  }

  const code = stages.validationStarted
    ? "invalid_analysis_response"
    : "analysis_failed";

  return new BadGatewayError(code, ANALYSIS_ERROR_MESSAGES[code], {
    cause: error,
    retryable: true,
  });
}

type AnalysisTimingKey = AnalysisRequestStage;

function createAnalysisRouteTiming() {
  const startedAt = readNowMs();
  const timingsMs: Partial<Record<AnalysisTimingKey, number>> = {};

  return {
    now: readNowMs,
    setTiming(key: AnalysisTimingKey, stepStartedAt: number) {
      timingsMs[key] = readDurationMs(stepStartedAt);
    },
    setTimingIfUnset(key: AnalysisTimingKey, stepStartedAt: number) {
      timingsMs[key] ??= readDurationMs(stepStartedAt);
    },
    snapshot() {
      return {
        timingsMs: {
          ...timingsMs,
          total: readDurationMs(startedAt),
        },
      };
    },
  };
}

function logAnalysisTiming(
  logger: AnalysisTimingLogger | undefined,
  entry: AnalysisTimingLogEntry,
) {
  try {
    logger?.(entry);
  } catch {
    // Timing logs must never affect the request path.
  }
}

function readNowMs() {
  return performance.now();
}

function readDurationMs(startedAt: number) {
  return Math.max(0, Math.round((readNowMs() - startedAt) * 100) / 100);
}
