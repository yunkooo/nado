import { Hono } from "hono";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  analyzeRequestSchema,
  isLikelyEnglishLearningText,
} from "@nado/shared";

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

export const app = new Hono();

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

  return context.json({
    input: input.text,
    maxLength: MAX_ANALYSIS_TEXT_LENGTH,
    message: "AI analysis will be connected in the MVP implementation phase.",
    status: "stub",
  });
});
