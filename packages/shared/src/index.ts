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

export const analysisTokenSchema = z.object({
  text: z.string(),
  vocabularyKey: z.string().nullable(),
});

export const analysisChunkSchema = z.object({
  english: z.string().trim().min(1, "analysis.chunk.english.required"),
  literalTranslation: z
    .string()
    .trim()
    .min(1, "analysis.chunk.literal_translation.required"),
  role: z.string().trim().min(1, "analysis.chunk.role.required"),
});

export const analysisGrammarPointSchema = z.object({
  title: z.string().trim().min(1, "analysis.grammar.title.required"),
  grammarType: z.string().trim().min(1).optional(),
  explanation: z
    .string()
    .trim()
    .min(1, "analysis.grammar.explanation.required"),
});

export const analysisSentenceSchema = z.object({
  source: z.string().trim().min(1, "analysis.sentence.source.required"),
  translation: z
    .string()
    .trim()
    .min(1, "analysis.sentence.translation.required"),
  explanation: z
    .string()
    .trim()
    .min(1, "analysis.sentence.explanation.required"),
  tokens: z.array(analysisTokenSchema),
  chunks: z.array(analysisChunkSchema).min(1, "analysis.chunks.required"),
  grammarPoints: z.array(analysisGrammarPointSchema),
});

export const analysisStructureItemSchema = z.object({
  english: z.string().trim().min(1, "analysis.structure.english.required"),
  korean: z.string().trim().min(1, "analysis.structure.korean.required"),
  note: z.string().trim().min(1, "analysis.structure.note.required"),
});

export const analysisVocabularyItemSchema = z.object({
  key: z.string().trim().min(1, "analysis.vocabulary.key.required"),
  term: z.string().trim().min(1, "analysis.vocabulary.term.required"),
  baseForm: z.string().trim().min(1, "analysis.vocabulary.base_form.required"),
  type: vocabularyTypeSchema,
  partOfSpeech: z.string().trim().min(1).nullable(),
  meaning: z.string().trim().min(1, "analysis.vocabulary.meaning.required"),
  contextMeaning: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.context_meaning.required"),
  saveLabel: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.save_label.required"),
});

export const analysisVocabularySuggestionSchema = z.object({
  key: z.string().trim().min(1, "analysis.suggestion.key.required"),
  term: z.string().trim().min(1, "analysis.suggestion.term.required"),
  type: vocabularyTypeSchema,
  meaning: z.string().trim().min(1, "analysis.suggestion.meaning.required"),
  note: z.string().trim().optional(),
});

export const analysisResultSchema = z.object({
  translation: z.string().trim().min(1, "analysis.translation.required"),
  translationExplanation: z
    .string()
    .trim()
    .min(1, "analysis.translation_explanation.required"),
  sentences: z
    .array(analysisSentenceSchema)
    .min(1, "analysis.sentences.required"),
  structure: z.array(analysisStructureItemSchema),
  grammarPoints: z.array(analysisGrammarPointSchema),
  vocabularyItems: z.array(analysisVocabularyItemSchema),
  vocabularySuggestions: z.array(analysisVocabularySuggestionSchema),
});

export const analyzeResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("analyzable"),
    result: analysisResultSchema,
  }),
  z.object({
    status: z.literal("not_analyzable"),
    reason: z.string().trim().min(1, "analysis.not_analyzable.reason.required"),
  }),
]);

export const vocabularyListResponseSchema = z.object({
  items: z.array(vocabularyItemSchema),
});

export const saveVocabularyResponseSchema = z.object({
  item: vocabularyItemSchema,
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
export type AnalysisToken = z.infer<typeof analysisTokenSchema>;
export type AnalysisChunk = z.infer<typeof analysisChunkSchema>;
export type AnalysisGrammarPoint = z.infer<typeof analysisGrammarPointSchema>;
export type AnalysisSentence = z.infer<typeof analysisSentenceSchema>;
export type AnalysisStructureItem = z.infer<typeof analysisStructureItemSchema>;
export type AnalysisVocabularyItem = z.infer<
  typeof analysisVocabularyItemSchema
>;
export type AnalysisVocabularySuggestion = z.infer<
  typeof analysisVocabularySuggestionSchema
>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type VocabularyListResponse = z.infer<
  typeof vocabularyListResponseSchema
>;
export type SaveVocabularyResponse = z.infer<
  typeof saveVocabularyResponseSchema
>;
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
