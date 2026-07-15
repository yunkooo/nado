import { describe, expect, it } from "vitest";
import { analyzeResponseSchema } from "@nado/shared/analysis";
import {
  compactAnalyzeResponseJsonSchema,
  compactAnalyzeResponseSchema,
  expandCompactAnalyzeResponse,
} from "./compactAnalysisContract.js";

const compactResponse = {
  reason: null,
  result: {
    grammarPoints: null,
    sentences: [
      {
        chunks: [
          {
            english: "Careful tests",
            literalTranslation: "신중한 테스트는",
            role: null,
          },
          {
            english: "keep products reliable",
            literalTranslation: "제품을 신뢰할 수 있게 유지한다",
            role: null,
          },
        ],
        explanation: null,
        grammarPoints: [
          {
            explanation: "keep 뒤에 목적어와 보어가 이어집니다.",
            grammarType: "5형식",
            title: "keep products reliable",
          },
        ],
        source: "Careful tests keep products reliable.",
        tokens: null,
        translation: "신중한 테스트는 제품을 신뢰할 수 있게 유지합니다.",
      },
    ],
    structure: [],
    translation: "신중한 테스트는 제품을 신뢰할 수 있게 유지합니다.",
    translationExplanation: "자연스러운 능동문입니다.",
    vocabularyItems: [
      {
        baseForm: "careful",
        contextMeaning: "신중한",
        key: null,
        meaning: "신중한",
        partOfSpeech: "adjective",
        saveLabel: null,
        term: "Careful",
        type: "word",
      },
      {
        baseForm: "test",
        contextMeaning: "테스트",
        key: null,
        meaning: "시험, 테스트",
        partOfSpeech: "noun",
        saveLabel: null,
        term: "tests",
        type: "word",
      },
    ],
    vocabularySuggestions: [
      {
        key: null,
        meaning: "신뢰할 수 있게 유지하다",
        note: null,
        term: "keep reliable",
        type: "phrase",
      },
    ],
  },
  status: "analyzable",
} as const;

describe("compactAnalysisContract", () => {
  it("uses null placeholders for fields reconstructed by the API", () => {
    const serializedSchema = JSON.stringify(compactAnalyzeResponseJsonSchema);

    expect(serializedSchema).toContain('"tokens":{"type":"null"}');
    expect(serializedSchema).toContain('"grammarPoints":{"type":"null"}');
    expect(serializedSchema).toContain('"saveLabel":{"type":"null"}');
  });

  it("expands compact provider output into the public analysis contract", () => {
    const compact = compactAnalyzeResponseSchema.parse(compactResponse);
    const expanded = expandCompactAnalyzeResponse(compact);

    expect(analyzeResponseSchema.safeParse(expanded).success).toBe(true);
    expect(expanded).toMatchObject({
      status: "analyzable",
      result: {
        grammarPoints: [],
        sentences: [
          {
            explanation: "신중한 테스트는 제품을 신뢰할 수 있게 유지합니다.",
            tokens: [],
          },
        ],
        vocabularyItems: [
          { key: "v1", saveLabel: "careful" },
          { key: "v2", saveLabel: "test" },
        ],
        vocabularySuggestions: [{ key: "s1" }],
      },
    });
  });
});
