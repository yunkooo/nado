import { z } from "zod";

export const MAX_ANALYSIS_TEXT_LENGTH = 200;

const allowedAnalysisTextPattern = /^[A-Za-z0-9 \t\n\r.,!?'"’“”()\[\]\-:;]+$/u;
const allowedControlCharactersPattern = /[\t\n\r]/g;
const controlOrFormatCharactersPattern = /[\p{Cc}\p{Cf}]/u;

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

export const vocabularyTypeSchema = z.enum(["word", "phrase"]);

export const analyzeRequestSchema = z.object({
  text: analysisTextSchema,
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

export const VOCABULARY_PAGE_SIZE = 10;

export type VocabularyPaginationResult<T> = {
  currentPage: number;
  items: T[];
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function paginateVocabularyItems<T>(
  items: T[],
  page: number,
): VocabularyPaginationResult<T> {
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / VOCABULARY_PAGE_SIZE),
  );
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * VOCABULARY_PAGE_SIZE;

  return {
    currentPage,
    items: items.slice(startIndex, startIndex + VOCABULARY_PAGE_SIZE),
    pageSize: VOCABULARY_PAGE_SIZE,
    totalItems: items.length,
    totalPages,
  };
}

type ScrollTarget = {
  clientHeight?: number;
  scrollHeight?: number;
  scrollTo(options: { behavior: "auto"; top: number }): void;
};

export function resetVocabularyPaginationScroll(
  scrollTarget?: ScrollTarget | null,
) {
  if (scrollTarget) {
    scrollTarget.scrollTo({ behavior: "auto", top: 0 });

    if (canScroll(scrollTarget)) {
      return;
    }
  }

  if (typeof globalThis.scrollTo === "function") {
    globalThis.scrollTo({ behavior: "auto", top: 0 });
  }
}

function canScroll(scrollTarget: ScrollTarget): boolean {
  if (
    typeof scrollTarget.scrollHeight !== "number" ||
    typeof scrollTarget.clientHeight !== "number"
  ) {
    return true;
  }

  return scrollTarget.scrollHeight > scrollTarget.clientHeight;
}

export function moveVocabularyPage(
  nextPage: number,
  setPage: (page: number) => void,
  scrollTarget?: ScrollTarget | null,
) {
  setPage(nextPage);
  resetVocabularyPaginationScroll(scrollTarget);
}

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

const nullableStringJsonSchema = {
  anyOf: [{ type: "string" }, { type: "null" }],
};

const vocabularyTypeJsonSchema = {
  enum: ["word", "phrase"],
  type: "string",
};

const analysisGrammarPointJsonSchema = {
  additionalProperties: false,
  properties: {
    explanation: { minLength: 1, type: "string" },
    title: { minLength: 1, type: "string" },
  },
  required: ["title", "explanation"],
  type: "object",
};

export const analyzeResponseJsonSchema = {
  additionalProperties: false,
  properties: {
    reason: nullableStringJsonSchema,
    result: {
      anyOf: [
        {
          additionalProperties: false,
          properties: {
            grammarPoints: {
              items: analysisGrammarPointJsonSchema,
              type: "array",
            },
            sentences: {
              items: {
                additionalProperties: false,
                properties: {
                  chunks: {
                    items: {
                      additionalProperties: false,
                      properties: {
                        english: { minLength: 1, type: "string" },
                        literalTranslation: {
                          minLength: 1,
                          type: "string",
                        },
                        role: { minLength: 1, type: "string" },
                      },
                      required: ["english", "literalTranslation", "role"],
                      type: "object",
                    },
                    minItems: 1,
                    type: "array",
                  },
                  explanation: { minLength: 1, type: "string" },
                  grammarPoints: {
                    items: analysisGrammarPointJsonSchema,
                    type: "array",
                  },
                  source: { minLength: 1, type: "string" },
                  tokens: {
                    items: {
                      additionalProperties: false,
                      properties: {
                        text: { type: "string" },
                        vocabularyKey: nullableStringJsonSchema,
                      },
                      required: ["text", "vocabularyKey"],
                      type: "object",
                    },
                    type: "array",
                  },
                  translation: { minLength: 1, type: "string" },
                },
                required: [
                  "source",
                  "translation",
                  "explanation",
                  "tokens",
                  "chunks",
                  "grammarPoints",
                ],
                type: "object",
              },
              minItems: 1,
              type: "array",
            },
            structure: {
              items: {
                additionalProperties: false,
                properties: {
                  english: { minLength: 1, type: "string" },
                  korean: { minLength: 1, type: "string" },
                  note: { minLength: 1, type: "string" },
                },
                required: ["english", "korean", "note"],
                type: "object",
              },
              type: "array",
            },
            translation: { minLength: 1, type: "string" },
            translationExplanation: { minLength: 1, type: "string" },
            vocabularyItems: {
              items: {
                additionalProperties: false,
                properties: {
                  baseForm: { minLength: 1, type: "string" },
                  contextMeaning: { minLength: 1, type: "string" },
                  key: { minLength: 1, type: "string" },
                  meaning: { minLength: 1, type: "string" },
                  partOfSpeech: nullableStringJsonSchema,
                  saveLabel: { minLength: 1, type: "string" },
                  term: { minLength: 1, type: "string" },
                  type: vocabularyTypeJsonSchema,
                },
                required: [
                  "key",
                  "term",
                  "baseForm",
                  "type",
                  "partOfSpeech",
                  "meaning",
                  "contextMeaning",
                  "saveLabel",
                ],
                type: "object",
              },
              type: "array",
            },
            vocabularySuggestions: {
              items: {
                additionalProperties: false,
                properties: {
                  key: { minLength: 1, type: "string" },
                  meaning: { minLength: 1, type: "string" },
                  term: { minLength: 1, type: "string" },
                  type: vocabularyTypeJsonSchema,
                },
                required: ["key", "term", "type", "meaning"],
                type: "object",
              },
              type: "array",
            },
          },
          required: [
            "translation",
            "translationExplanation",
            "sentences",
            "structure",
            "grammarPoints",
            "vocabularyItems",
            "vocabularySuggestions",
          ],
          type: "object",
        },
        { type: "null" },
      ],
    },
    status: {
      enum: ["analyzable", "not_analyzable"],
      type: "string",
    },
  },
  required: ["status", "result", "reason"],
  type: "object",
} as const;

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

export function createVocabularyMeaningRenderKey(
  itemId: string,
  meaning: VocabularyMeaning,
  index: number,
): string {
  return `${itemId}-${meaning.createdAt ?? "pending"}-${meaning.meaning}-${index}`;
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
