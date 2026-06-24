import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  ANALYSIS_ERROR_MESSAGES,
  analyzeResponseSchema,
  isLikelyEnglishLearningText,
} from "@nado/shared";
import { parseAnalyzeInput } from "../../features/analysis/analyzeInput.js";
import type {
  AnalysisUsageService,
  AnalyzeService,
} from "../../features/analysis/analysisTypes.js";
import { resolveAnalyzeUsageIdentity } from "../../features/analysis/usageIdentity.js";
import type { AuthService } from "../../features/auth/authService.js";
import { isHttpError } from "../../shared/errors/httpErrors.js";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { readRequestIp } from "../../shared/http/requestIp.js";

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
      const requestId = randomUUID();
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

      const usageIdentityStartedAt = routeTiming.now();
      const usageIdentity = await resolveAnalyzeUsageIdentity({
        authService,
        authorization: request.header("Authorization"),
        clientIp: readRequestIp(request),
        usageIpHashSalt,
      });
      routeTiming.setTiming("usageIdentity", usageIdentityStartedAt);

      const usageConsumeStartedAt = routeTiming.now();
      const usageDecision = await analysisUsageService.consume(usageIdentity);
      routeTiming.setTiming("usageConsume", usageConsumeStartedAt);
      const usageIdentityKind = usageIdentity.userId
        ? "authenticated"
        : "anonymous";

      if (!usageDecision.ok) {
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
          .set("Retry-After", String(usageDecision.retryAfterSeconds))
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

      let analyzeStartedAt: number | null = null;
      let validationStartedAt: number | null = null;

      try {
        analyzeStartedAt = routeTiming.now();
        const rawAnalysis = await analyzeService.analyze({
          model: input.model,
          text: input.text,
        });
        routeTiming.setTiming("analyze", analyzeStartedAt);

        validationStartedAt = routeTiming.now();
        const analysis = analyzeResponseSchema.parse(rawAnalysis);
        routeTiming.setTiming("responseValidation", validationStartedAt);

        logAnalysisTiming(analysisTimingLogger, {
          ...routeTiming.snapshot(),
          model: input.model,
          outcome: "success",
          requestId,
          route: "POST /api/analyze",
          status: analysis.status,
          statusCode: 200,
          textLength: input.text.length,
          usageIdentity: usageIdentityKind,
        });

        return response.json(analysis);
      } catch (error) {
        if (analyzeStartedAt !== null) {
          routeTiming.setTimingIfUnset("analyze", analyzeStartedAt);
        }

        if (validationStartedAt !== null) {
          routeTiming.setTimingIfUnset(
            "responseValidation",
            validationStartedAt,
          );
        }

        if (isHttpError(error)) {
          logAnalysisTiming(analysisTimingLogger, {
            ...routeTiming.snapshot(),
            errorCode: error.code,
            model: input.model,
            outcome: "error",
            requestId,
            route: "POST /api/analyze",
            statusCode: error.status,
            textLength: input.text.length,
            usageIdentity: usageIdentityKind,
          });

          return response.status(error.status).json({
            error: {
              code: error.code,
              message: error.publicMessage,
              requestId,
              retryable: error.status >= 500,
            },
          });
        }

        const fallbackErrorCode =
          validationStartedAt === null
            ? "analysis_failed"
            : "invalid_analysis_response";

        logAnalysisTiming(analysisTimingLogger, {
          ...routeTiming.snapshot(),
          errorCode: fallbackErrorCode,
          model: input.model,
          outcome: "error",
          requestId,
          route: "POST /api/analyze",
          statusCode: 502,
          textLength: input.text.length,
          usageIdentity: usageIdentityKind,
        });

        return response.status(502).json({
          error: {
            code: fallbackErrorCode,
            message: ANALYSIS_ERROR_MESSAGES[fallbackErrorCode],
            requestId,
            retryable: true,
          },
        });
      }
    }),
  );

  return router;
}

type AnalysisTimingKey =
  | "analyze"
  | "responseValidation"
  | "usageConsume"
  | "usageIdentity";

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
