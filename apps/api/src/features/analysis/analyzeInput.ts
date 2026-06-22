import { analyzeRequestSchema } from "@nado/shared";
import type { AnalysisModelId } from "@nado/shared";

export type AnalyzeInputResult =
  | { model: AnalysisModelId; ok: true; text: string }
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
    model: parsed.data.model,
    ok: true,
    text: parsed.data.text,
  };
}
