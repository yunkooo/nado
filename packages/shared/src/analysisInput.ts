import { z } from "zod";

export const MAX_ANALYSIS_TEXT_LENGTH = 200;
export const MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS = 4_096;
export const MAX_ANALYSIS_FIELD_LENGTH = 4_000;
export const MAX_ANALYSIS_LIST_ITEMS = 100;
export const MAX_ANALYSIS_SENTENCES = 20;
export const MAX_ANALYSIS_SENTENCE_TOKENS = 300;

export const ANALYSIS_MODELS = [
  {
    id: "moonshotai/kimi-k2.7-code",
    label: "Kimi K2.7 Code",
    provider: "openrouter",
  },
  {
    id: "z-ai/glm-5.2",
    label: "GLM 5.2",
    provider: "openrouter",
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT 5.4 mini",
    provider: "openai",
  },
] as const;

export const DEFAULT_ANALYSIS_MODEL_ID = ANALYSIS_MODELS[0].id;
export const analysisModelIdSchema = z.enum([
  "moonshotai/kimi-k2.7-code",
  "z-ai/glm-5.2",
  "gpt-5.4-mini",
]);
export type AnalysisModelId = z.infer<typeof analysisModelIdSchema>;

const allowedAnalysisTextPattern = /^[A-Za-z0-9 \t\n\r.,!?'"’“”()\[\]\-:;]+$/u;
const allowedControlCharactersPattern = /[\t\n\r]/g;
const controlOrFormatCharactersPattern = /[\p{Cc}\p{Cf}]/u;

export function isOpenRouterAnalysisModelId(modelId: AnalysisModelId): boolean {
  return ANALYSIS_MODELS.some(
    (model) => model.id === modelId && model.provider === "openrouter",
  );
}

export function normalizeAnalysisText(text: string): string {
  return text.normalize("NFKC").trim();
}

export function countAnalysisTextCharacters(text: string): number {
  return Array.from(normalizeAnalysisText(text)).length;
}

export function hasUnsupportedAnalysisTextCharacters(text: string): boolean {
  const normalized = normalizeAnalysisText(text);

  if (countAnalysisTextCharacters(normalized) === 0) {
    return false;
  }

  const textWithoutAllowedControls = normalized.replace(
    allowedControlCharactersPattern,
    "",
  );

  return (
    controlOrFormatCharactersPattern.test(textWithoutAllowedControls) ||
    !allowedAnalysisTextPattern.test(normalized)
  );
}

const analysisTextSchema = z
  .string()
  .transform(normalizeAnalysisText)
  .superRefine((text, context) => {
    const characterCount = countAnalysisTextCharacters(text);

    if (characterCount === 0) {
      context.addIssue({
        code: "custom",
        message: "analysis.text.required",
      });
      return;
    }

    if (hasUnsupportedAnalysisTextCharacters(text)) {
      context.addIssue({
        code: "custom",
        message: "analysis.text.unsupported_characters",
      });
    }

    if (characterCount > MAX_ANALYSIS_TEXT_LENGTH) {
      context.addIssue({
        code: "custom",
        message: "analysis.text.too_long",
      });
    }
  });

export const analyzeRequestSchema = z.object({
  model: analysisModelIdSchema.default(DEFAULT_ANALYSIS_MODEL_ID),
  text: analysisTextSchema,
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export function parseAnalyzeRequest(input: unknown): AnalyzeRequest {
  return analyzeRequestSchema.parse(input);
}

export function isLikelyEnglishLearningText(text: string): boolean {
  const normalized = normalizeAnalysisText(text);

  if (
    countAnalysisTextCharacters(normalized) === 0 ||
    countAnalysisTextCharacters(normalized) > MAX_ANALYSIS_TEXT_LENGTH ||
    hasUnsupportedAnalysisTextCharacters(normalized)
  ) {
    return false;
  }

  const letters = normalized.match(/[A-Za-z]/g)?.length ?? 0;
  const visibleChars = Array.from(normalized.replace(/\s/g, "")).length;
  const letterRatio = visibleChars === 0 ? 0 : letters / visibleChars;

  if (letterRatio < 0.45) {
    return false;
  }

  if (/^(.)\1{9,}$/.test(normalized)) {
    return false;
  }

  return true;
}
