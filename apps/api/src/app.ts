import { Hono } from "hono";
import {
  analyzeResponseSchema,
  analyzeRequestSchema,
  isLikelyEnglishLearningText,
} from "@nado/shared";
import type { AnalyzeResponse } from "@nado/shared";
import { createOpenAIAnalysisService } from "./openaiAnalysisService.js";

export type AnalyzeInputResult =
  | { ok: true; text: string }
  | { code: "invalid_input"; issues: string[]; ok: false };

export function parseAnalyzeInput(input: unknown): AnalyzeInputResult {
  const parsed = analyzeRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return {
    ok: true,
    text: parsed.data.text,
  };
}

export type AnalyzeService = {
  analyze(text: string): Promise<AnalyzeResponse>;
};

export type AppDependencies = {
  analyzeService?: AnalyzeService;
};

export function createApp(dependencies: AppDependencies = {}): Hono {
  const app = new Hono();
  const analyzeService =
    dependencies.analyzeService ?? createOpenAIAnalysisService();

  app.get("/health", (context) =>
    context.json({
      service: "nado-api",
      status: "ok",
    }),
  );

  app.post("/api/analyze", async (context) => {
    let body: unknown;

    try {
      body = await context.req.json();
    } catch {
      return context.json(
        {
          error: {
            code: "invalid_json",
            message: "Invalid JSON body.",
          },
        },
        400,
      );
    }

    const input = parseAnalyzeInput(body);

    if (!input.ok) {
      return context.json(
        {
          error: {
            code: input.code,
            issues: input.issues,
            message:
              "Text must be a non-empty English sentence up to 500 characters.",
          },
        },
        400,
      );
    }

    if (!isLikelyEnglishLearningText(input.text)) {
      return context.json({
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
        status: "not_analyzable",
      });
    }

    try {
      const analysis = analyzeResponseSchema.parse(
        await analyzeService.analyze(input.text),
      );

      return context.json(analysis);
    } catch {
      return context.json(
        {
          error: {
            code: "analysis_failed",
            message: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
          },
        },
        502,
      );
    }
  });

  return app;
}

export const app = createApp();
