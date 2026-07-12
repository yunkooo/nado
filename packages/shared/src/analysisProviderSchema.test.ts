import { describe, expect, it } from "vitest";
import { analyzeResponseSchema } from "./analysisContracts";
import {
  MAX_ANALYSIS_FIELD_LENGTH,
  MAX_ANALYSIS_LIST_ITEMS,
  MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS,
} from "./analysisInput";
import { analyzeResponseJsonSchema } from "./analysisProviderSchema";

describe("analyzeResponseJsonSchema", () => {
  it("uses an OpenAI structured-output compatible root object", () => {
    expect(analyzeResponseJsonSchema).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
    expect(analyzeResponseJsonSchema).not.toHaveProperty("oneOf");
  });

  it("keeps provider and runtime optional fields in parity", () => {
    const serializedSchema = JSON.stringify(analyzeResponseJsonSchema);

    expect(serializedSchema).toContain('"grammarType"');
    expect(serializedSchema).toContain('"note"');
    expect(serializedSchema).toContain('"maxLength"');
    expect(serializedSchema).toContain('"maxItems"');
  });

  it("requires every declared property in strict provider objects", () => {
    expectStrictProviderObjects(analyzeResponseJsonSchema);
  });

  it("normalizes nullable provider fields to optional runtime values", () => {
    const response = analyzeResponseSchema.parse({
      status: "analyzable",
      result: {
        translation: "번역",
        translationExplanation: "설명",
        sentences: [
          {
            source: "Hello.",
            translation: "안녕하세요.",
            explanation: "인사입니다.",
            tokens: [],
            chunks: [
              {
                english: "Hello.",
                literalTranslation: "안녕하세요.",
                role: "인사",
              },
            ],
            grammarPoints: [
              {
                title: "인사",
                grammarType: null,
                explanation: "기본 인사입니다.",
              },
            ],
          },
        ],
        structure: [],
        grammarPoints: [],
        vocabularyItems: [],
        vocabularySuggestions: [
          {
            key: "hello",
            term: "hello",
            type: "word",
            meaning: "안녕하세요",
            note: null,
          },
        ],
      },
    });

    if (response.status !== "analyzable") {
      throw new Error("Expected analyzable response.");
    }

    expect(response.result.sentences[0]?.grammarPoints[0]?.grammarType).toBe(
      undefined,
    );
    expect(response.result.vocabularySuggestions[0]?.note).toBe(undefined);
  });

  it("bounds provider output size and structured response collections", () => {
    expect(MAX_ANALYSIS_PROVIDER_OUTPUT_TOKENS).toBe(4_096);
    expect(
      analyzeResponseSchema.safeParse({
        status: "not_analyzable",
        reason: "a".repeat(MAX_ANALYSIS_FIELD_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      analyzeResponseSchema.safeParse({
        status: "analyzable",
        result: {
          translation: "번역",
          translationExplanation: "설명",
          sentences: Array.from(
            { length: MAX_ANALYSIS_LIST_ITEMS + 1 },
            () => ({
              source: "Hello.",
              translation: "안녕하세요.",
              explanation: "인사입니다.",
              tokens: [],
              chunks: [
                {
                  english: "Hello.",
                  literalTranslation: "안녕하세요.",
                  role: "인사",
                },
              ],
              grammarPoints: [],
            }),
          ),
          structure: [],
          grammarPoints: [],
          vocabularyItems: [],
          vocabularySuggestions: [],
        },
      }).success,
    ).toBe(false);
  });
});

function expectStrictProviderObjects(value: unknown, path = "root"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      expectStrictProviderObjects(entry, `${path}[${index}]`),
    );
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const schema = value as Record<string, unknown>;
  const properties = schema.properties;

  if (
    schema.type === "object" &&
    properties &&
    typeof properties === "object" &&
    !Array.isArray(properties)
  ) {
    expect(schema.additionalProperties, path).toBe(false);
    expect(new Set(schema.required as string[]), path).toEqual(
      new Set(Object.keys(properties)),
    );
  }

  for (const [key, entry] of Object.entries(schema)) {
    expectStrictProviderObjects(entry, `${path}.${key}`);
  }
}
