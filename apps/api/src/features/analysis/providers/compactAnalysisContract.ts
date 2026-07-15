import { z } from "zod";
import {
  analysisChunkSchema,
  analysisResultSchema,
  analysisSentenceSchema,
  analysisVocabularyItemSchema,
  analysisVocabularySuggestionSchema,
  analyzeResponseJsonSchema,
  analyzeResponseSchema,
  type AnalyzeResponse,
} from "@nado/shared/analysis";

const compactChunkSchema = analysisChunkSchema
  .omit({ role: true })
  .extend({ role: z.null() });

const compactSentenceSchema = analysisSentenceSchema
  .omit({ chunks: true, explanation: true, tokens: true })
  .extend({
    chunks: z.array(compactChunkSchema).min(1),
    explanation: z.null(),
    tokens: z.null(),
  });

const compactVocabularyItemSchema = analysisVocabularyItemSchema
  .omit({ key: true, saveLabel: true })
  .extend({ key: z.null(), saveLabel: z.null() });

const compactVocabularySuggestionSchema = analysisVocabularySuggestionSchema
  .omit({ key: true })
  .extend({ key: z.null() });

const compactAnalysisResultSchema = analysisResultSchema
  .omit({
    grammarPoints: true,
    sentences: true,
    vocabularyItems: true,
    vocabularySuggestions: true,
  })
  .extend({
    grammarPoints: z.null(),
    sentences: z.array(compactSentenceSchema).min(1),
    vocabularyItems: z.array(compactVocabularyItemSchema),
    vocabularySuggestions: z.array(compactVocabularySuggestionSchema),
  });

export const compactAnalyzeResponseSchema = z.discriminatedUnion("status", [
  z.object({
    reason: z.null(),
    result: compactAnalysisResultSchema,
    status: z.literal("analyzable"),
  }),
  z.object({
    reason: z.string().trim().min(1),
    result: z.null(),
    status: z.literal("not_analyzable"),
  }),
]);

export type CompactAnalyzeResponse = z.infer<
  typeof compactAnalyzeResponseSchema
>;

const nullableOnlyJsonSchema = { type: "null" } as const;

export const compactAnalyzeResponseJsonSchema =
  createCompactAnalyzeResponseJsonSchema();

export function expandCompactAnalyzeResponse(
  analysis: CompactAnalyzeResponse,
): AnalyzeResponse {
  if (analysis.status === "not_analyzable") {
    return {
      reason: analysis.reason,
      status: "not_analyzable",
    };
  }

  return analyzeResponseSchema.parse({
    status: "analyzable",
    result: {
      ...analysis.result,
      grammarPoints: [],
      sentences: analysis.result.sentences.map((sentence) => ({
        ...sentence,
        chunks: sentence.chunks.map((chunk) => ({
          ...chunk,
          role: "구문",
        })),
        explanation: sentence.translation,
        tokens: [],
      })),
      vocabularyItems: analysis.result.vocabularyItems.map((item, index) => ({
        ...item,
        key: createDerivedKey("v", index),
        saveLabel: item.baseForm,
      })),
      vocabularySuggestions: analysis.result.vocabularySuggestions.map(
        (suggestion, index) => ({
          ...suggestion,
          key: createDerivedKey("s", index),
        }),
      ),
    },
  });
}

function createCompactAnalyzeResponseJsonSchema() {
  const schema = structuredClone(analyzeResponseJsonSchema) as unknown;
  const root = readRecord(schema, "root");
  const rootProperties = readRecord(root.properties, "root.properties");
  const result = readRecord(rootProperties.result, "root.properties.result");
  const resultAnyOf = readArray(result.anyOf, "root.properties.result.anyOf");
  const analyzableResult = readRecord(
    resultAnyOf[0],
    "root.properties.result.anyOf[0]",
  );
  const resultProperties = readRecord(
    analyzableResult.properties,
    "analyzableResult.properties",
  );

  resultProperties.grammarPoints = nullableOnlyJsonSchema;

  const sentences = readRecord(resultProperties.sentences, "sentences");
  const sentence = readRecord(sentences.items, "sentences.items");
  const sentenceProperties = readRecord(
    sentence.properties,
    "sentences.items.properties",
  );
  sentenceProperties.explanation = nullableOnlyJsonSchema;
  sentenceProperties.tokens = nullableOnlyJsonSchema;

  const chunks = readRecord(sentenceProperties.chunks, "chunks");
  chunks.maxItems = 8;
  const chunk = readRecord(chunks.items, "chunks.items");
  const chunkProperties = readRecord(
    chunk.properties,
    "chunks.items.properties",
  );
  chunkProperties.role = nullableOnlyJsonSchema;

  const sentenceGrammarPoints = readRecord(
    sentenceProperties.grammarPoints,
    "sentences.items.properties.grammarPoints",
  );
  sentenceGrammarPoints.maxItems = 2;

  const structure = readRecord(resultProperties.structure, "structure");
  structure.maxItems = 3;

  const vocabularyItems = readRecord(
    resultProperties.vocabularyItems,
    "vocabularyItems",
  );
  const vocabularyItem = readRecord(
    vocabularyItems.items,
    "vocabularyItems.items",
  );
  const vocabularyItemProperties = readRecord(
    vocabularyItem.properties,
    "vocabularyItems.items.properties",
  );
  vocabularyItemProperties.key = nullableOnlyJsonSchema;
  vocabularyItemProperties.saveLabel = nullableOnlyJsonSchema;

  const vocabularySuggestions = readRecord(
    resultProperties.vocabularySuggestions,
    "vocabularySuggestions",
  );
  vocabularySuggestions.maxItems = 5;
  const vocabularySuggestion = readRecord(
    vocabularySuggestions.items,
    "vocabularySuggestions.items",
  );
  const vocabularySuggestionProperties = readRecord(
    vocabularySuggestion.properties,
    "vocabularySuggestions.items.properties",
  );
  vocabularySuggestionProperties.key = nullableOnlyJsonSchema;

  return root;
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected an object at ${path}.`);
  }

  return value as Record<string, unknown>;
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected an array at ${path}.`);
  }

  return value;
}

function createDerivedKey(prefix: "s" | "v", index: number) {
  return `${prefix}${index + 1}`;
}
