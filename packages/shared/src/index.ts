import { z } from "zod";

export const MAX_ANALYSIS_TEXT_LENGTH = 500;

export const vocabularyTypeSchema = z.enum(["word", "phrase"]);

export const analyzeRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "analysis.text.required")
    .max(MAX_ANALYSIS_TEXT_LENGTH, "analysis.text.too_long"),
});

export const vocabularyMeaningSchema = z.object({
  meaning: z.string().trim().min(1, "vocabulary.meaning.required"),
  note: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
});

export const vocabularyItemSchema = z.object({
  id: z.string(),
  term: z.string(),
  type: vocabularyTypeSchema,
  meanings: z.array(vocabularyMeaningSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const saveVocabularyRequestSchema = z.object({
  term: z.string().trim().min(1, "vocabulary.term.required"),
  type: vocabularyTypeSchema,
  meaning: z.string().trim().min(1, "vocabulary.meaning.required"),
  note: z.string().trim().optional(),
});

export const errorCodeSchema = z.enum([
  "invalid_json",
  "invalid_input",
  "not_authenticated",
  "not_found",
  "rate_limited",
  "analysis_failed",
]);

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type VocabularyType = z.infer<typeof vocabularyTypeSchema>;
export type VocabularyMeaning = z.infer<typeof vocabularyMeaningSchema>;
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
export type SaveVocabularyRequest = z.infer<typeof saveVocabularyRequestSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export function parseAnalyzeRequest(input: unknown): AnalyzeRequest {
  return analyzeRequestSchema.parse(input);
}

export function normalizeVocabularyTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isLikelyEnglishLearningText(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_ANALYSIS_TEXT_LENGTH) {
    return false;
  }

  const letters = trimmed.match(/[A-Za-z]/g)?.length ?? 0;
  const visibleChars = trimmed.replace(/\s/g, "").length;
  const letterRatio = visibleChars === 0 ? 0 : letters / visibleChars;

  if (letterRatio < 0.45) {
    return false;
  }

  if (/^(.)\1{9,}$/.test(trimmed)) {
    return false;
  }

  return true;
}
