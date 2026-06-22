import { Router } from "express";
import {
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
  analyzeService: AnalyzeService;
  authService: AuthService;
  usageIpHashSalt: string;
};

export function createAnalysisRoutes({
  analysisUsageService,
  analyzeService,
  authService,
  usageIpHashSalt,
}: AnalysisRoutesDependencies) {
  const router = Router();

  router.post(
    "/analyze",
    asyncRoute(async (request, response) => {
      const input = parseAnalyzeInput(request.body as unknown);

      if (!input.ok) {
        return response.status(400).json({
          error: {
            code: input.code,
            issues: input.issues,
            message:
              "Text must be a non-empty English sentence up to 200 supported characters.",
          },
        });
      }

      if (!isLikelyEnglishLearningText(input.text)) {
        return response.json({
          reason: "영어 문장으로 분석하기 어려운 입력입니다.",
          status: "not_analyzable",
        });
      }

      const usageIdentity = await resolveAnalyzeUsageIdentity({
        authService,
        authorization: request.header("Authorization"),
        clientIp: readRequestIp(request),
        usageIpHashSalt,
      });
      const usageDecision = await analysisUsageService.consume(usageIdentity);

      if (!usageDecision.ok) {
        return response
          .set("Retry-After", String(usageDecision.retryAfterSeconds))
          .status(429)
          .json({
            error: {
              code: "rate_limited",
              message: "오늘 사용할 수 있는 분석 횟수를 모두 사용했어요.",
            },
          });
      }

      try {
        const analysis = analyzeResponseSchema.parse(
          await analyzeService.analyze({
            model: input.model,
            text: input.text,
          }),
        );

        return response.json(analysis);
      } catch (error) {
        if (isHttpError(error)) {
          throw error;
        }

        return response.status(502).json({
          error: {
            code: "analysis_failed",
            message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
          },
        });
      }
    }),
  );

  return router;
}
