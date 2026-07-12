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
} from "./vocabularyContracts.ts";

const nullableStringJsonSchema = {
  anyOf: [
    { maxLength: MAX_ANALYSIS_FIELD_LENGTH, type: "string" },
    { type: "null" },
  ],
};

const vocabularyTypeJsonSchema = {
  enum: ["word", "phrase"],
  type: "string",
};

const analysisGrammarPointJsonSchema = {
  additionalProperties: false,
  properties: {
    explanation: {
      maxLength: MAX_ANALYSIS_FIELD_LENGTH,
      minLength: 1,
      type: "string",
    },
    grammarType: {
      anyOf: [
        {
          maxLength: MAX_ANALYSIS_FIELD_LENGTH,
          minLength: 1,
          type: "string",
        },
        { type: "null" },
      ],
    },
    title: {
      maxLength: MAX_ANALYSIS_FIELD_LENGTH,
      minLength: 1,
      type: "string",
    },
  },
  required: ["title", "grammarType", "explanation"],
  type: "object",
};

/**
 * Provider-facing strict JSON schema.
 *
 * OpenAI-compatible structured output requires every declared property to be
 * listed in `required`. Runtime-optional values are therefore represented as
 * required nullable fields and normalized by the Zod contract afterwards.
 */
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
              maxItems: MAX_ANALYSIS_LIST_ITEMS,
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
                        english: {
                          maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                          minLength: 1,
                          type: "string",
                        },
                        literalTranslation: {
                          maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                          minLength: 1,
                          type: "string",
                        },
                        role: {
                          maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                          minLength: 1,
                          type: "string",
                        },
                      },
                      required: ["english", "literalTranslation", "role"],
                      type: "object",
                    },
                    maxItems: MAX_ANALYSIS_LIST_ITEMS,
                    minItems: 1,
                    type: "array",
                  },
                  explanation: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  grammarPoints: {
                    items: analysisGrammarPointJsonSchema,
                    maxItems: MAX_ANALYSIS_LIST_ITEMS,
                    type: "array",
                  },
                  source: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  tokens: {
                    items: {
                      additionalProperties: false,
                      properties: {
                        text: {
                          maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                          type: "string",
                        },
                        vocabularyKey: nullableStringJsonSchema,
                      },
                      required: ["text", "vocabularyKey"],
                      type: "object",
                    },
                    maxItems: MAX_ANALYSIS_SENTENCE_TOKENS,
                    type: "array",
                  },
                  translation: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
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
              maxItems: MAX_ANALYSIS_SENTENCES,
              minItems: 1,
              type: "array",
            },
            structure: {
              items: {
                additionalProperties: false,
                properties: {
                  english: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  korean: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  note: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                },
                required: ["english", "korean", "note"],
                type: "object",
              },
              maxItems: MAX_ANALYSIS_LIST_ITEMS,
              type: "array",
            },
            translation: {
              maxLength: MAX_ANALYSIS_FIELD_LENGTH,
              minLength: 1,
              type: "string",
            },
            translationExplanation: {
              maxLength: MAX_ANALYSIS_FIELD_LENGTH,
              minLength: 1,
              type: "string",
            },
            vocabularyItems: {
              items: {
                additionalProperties: false,
                properties: {
                  baseForm: {
                    maxLength: MAX_VOCABULARY_TERM_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  contextMeaning: {
                    maxLength: MAX_VOCABULARY_MEANING_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  key: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  meaning: {
                    maxLength: MAX_VOCABULARY_MEANING_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  partOfSpeech: nullableStringJsonSchema,
                  saveLabel: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  term: {
                    maxLength: MAX_VOCABULARY_TERM_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
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
              maxItems: MAX_ANALYSIS_LIST_ITEMS,
              type: "array",
            },
            vocabularySuggestions: {
              items: {
                additionalProperties: false,
                properties: {
                  key: {
                    maxLength: MAX_ANALYSIS_FIELD_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  meaning: {
                    maxLength: MAX_VOCABULARY_MEANING_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  note: {
                    anyOf: [
                      {
                        maxLength: MAX_VOCABULARY_NOTE_LENGTH,
                        type: "string",
                      },
                      { type: "null" },
                    ],
                  },
                  term: {
                    maxLength: MAX_VOCABULARY_TERM_LENGTH,
                    minLength: 1,
                    type: "string",
                  },
                  type: vocabularyTypeJsonSchema,
                },
                required: ["key", "term", "type", "meaning", "note"],
                type: "object",
              },
              maxItems: MAX_ANALYSIS_LIST_ITEMS,
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
