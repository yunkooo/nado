import { z } from "zod";
import {
  MAX_ANALYSIS_FIELD_LENGTH,
  MAX_ANALYSIS_LIST_ITEMS,
  MAX_ANALYSIS_SENTENCES,
  MAX_ANALYSIS_SENTENCE_TOKENS,
} from "./analysisInput.ts";
import {
  MAX_VOCABULARY_MEANING_LENGTH,
  MAX_VOCABULARY_NOTE_LENGTH,
  MAX_VOCABULARY_TERM_LENGTH,
  vocabularyTypeSchema,
} from "./vocabularyContracts.ts";

export { analyzeResponseJsonSchema } from "./analysisProviderSchema.ts";

export const analysisTokenSchema = z.object({
  text: z.string().max(MAX_ANALYSIS_FIELD_LENGTH),
  vocabularyKey: z.string().max(MAX_ANALYSIS_FIELD_LENGTH).nullable(),
});

export const analysisChunkSchema = z.object({
  english: z
    .string()
    .trim()
    .min(1, "analysis.chunk.english.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  literalTranslation: z
    .string()
    .trim()
    .min(1, "analysis.chunk.literal_translation.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  role: z
    .string()
    .trim()
    .min(1, "analysis.chunk.role.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
});

export const analysisGrammarPointSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "analysis.grammar.title.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  grammarType: z
    .string()
    .trim()
    .min(1)
    .max(MAX_ANALYSIS_FIELD_LENGTH)
    .nullish()
    .transform((value) => value ?? undefined),
  explanation: z
    .string()
    .trim()
    .min(1, "analysis.grammar.explanation.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
});

export const analysisSentenceSchema = z.object({
  source: z
    .string()
    .trim()
    .min(1, "analysis.sentence.source.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  translation: z
    .string()
    .trim()
    .min(1, "analysis.sentence.translation.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  explanation: z
    .string()
    .trim()
    .min(1, "analysis.sentence.explanation.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  tokens: z.array(analysisTokenSchema).max(MAX_ANALYSIS_SENTENCE_TOKENS),
  chunks: z
    .array(analysisChunkSchema)
    .min(1, "analysis.chunks.required")
    .max(MAX_ANALYSIS_LIST_ITEMS),
  grammarPoints: z
    .array(analysisGrammarPointSchema)
    .max(MAX_ANALYSIS_LIST_ITEMS),
});

export const analysisStructureItemSchema = z.object({
  english: z
    .string()
    .trim()
    .min(1, "analysis.structure.english.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  korean: z
    .string()
    .trim()
    .min(1, "analysis.structure.korean.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  note: z
    .string()
    .trim()
    .min(1, "analysis.structure.note.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
});

export const analysisVocabularyItemSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.key.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  term: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.term.required")
    .max(MAX_VOCABULARY_TERM_LENGTH),
  baseForm: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.base_form.required")
    .max(MAX_VOCABULARY_TERM_LENGTH),
  type: vocabularyTypeSchema,
  partOfSpeech: z
    .string()
    .trim()
    .min(1)
    .max(MAX_ANALYSIS_FIELD_LENGTH)
    .nullable(),
  meaning: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.meaning.required")
    .max(MAX_VOCABULARY_MEANING_LENGTH),
  contextMeaning: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.context_meaning.required")
    .max(MAX_VOCABULARY_MEANING_LENGTH),
  saveLabel: z
    .string()
    .trim()
    .min(1, "analysis.vocabulary.save_label.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
});

export const analysisVocabularySuggestionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "analysis.suggestion.key.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  term: z
    .string()
    .trim()
    .min(1, "analysis.suggestion.term.required")
    .max(MAX_VOCABULARY_TERM_LENGTH),
  type: vocabularyTypeSchema,
  meaning: z
    .string()
    .trim()
    .min(1, "analysis.suggestion.meaning.required")
    .max(MAX_VOCABULARY_MEANING_LENGTH),
  note: z
    .string()
    .trim()
    .max(MAX_VOCABULARY_NOTE_LENGTH)
    .nullish()
    .transform((value) => value ?? undefined),
});

export const analysisResultSchema = z.object({
  translation: z
    .string()
    .trim()
    .min(1, "analysis.translation.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  translationExplanation: z
    .string()
    .trim()
    .min(1, "analysis.translation_explanation.required")
    .max(MAX_ANALYSIS_FIELD_LENGTH),
  sentences: z
    .array(analysisSentenceSchema)
    .min(1, "analysis.sentences.required")
    .max(MAX_ANALYSIS_SENTENCES),
  structure: z.array(analysisStructureItemSchema).max(MAX_ANALYSIS_LIST_ITEMS),
  grammarPoints: z
    .array(analysisGrammarPointSchema)
    .max(MAX_ANALYSIS_LIST_ITEMS),
  vocabularyItems: z
    .array(analysisVocabularyItemSchema)
    .max(MAX_ANALYSIS_LIST_ITEMS),
  vocabularySuggestions: z
    .array(analysisVocabularySuggestionSchema)
    .max(MAX_ANALYSIS_LIST_ITEMS),
});

export const analyzeResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("analyzable"),
    result: analysisResultSchema,
  }),
  z.object({
    status: z.literal("not_analyzable"),
    reason: z
      .string()
      .trim()
      .min(1, "analysis.not_analyzable.reason.required")
      .max(MAX_ANALYSIS_FIELD_LENGTH),
  }),
]);

export const ANALYSIS_ERROR_MESSAGES = {
  analysis_failed: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
  analysis_timeout:
    "분석 요청 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
  invalid_analysis_response:
    "분석 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
} as const;

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
