import { describe, expect, it } from "vitest";
import {
  parseOpenAIAnalysisResponse,
  parseOpenRouterAnalysisResponse,
} from "./structuredAnalysisResponse.js";

const compactAnalyzeResponse = {
  reason: "분석할 수 있는 입력입니다.",
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
        ],
        explanation: null,
        grammarPoints: [],
        source: "Careful tests.",
        tokens: null,
        translation: "신중한 테스트입니다.",
      },
    ],
    structure: [],
    translation: "신중한 테스트입니다.",
    translationExplanation: "간결한 명사구입니다.",
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
        meaning: "테스트",
        partOfSpeech: "noun",
        saveLabel: null,
        term: "tests",
        type: "word",
      },
    ],
    vocabularySuggestions: [],
  },
  status: "analyzable",
} as const;

const providerResponseCases = [
  {
    createResponse: (output: unknown) =>
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: JSON.stringify(output),
                  type: "output_text",
                },
              ],
            },
          ],
        }),
      ),
    parseResponse: parseOpenAIAnalysisResponse,
    provider: "OpenAI",
  },
  {
    createResponse: (output: unknown) =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(output),
              },
            },
          ],
        }),
      ),
    parseResponse: parseOpenRouterAnalysisResponse,
    provider: "OpenRouter",
  },
] as const;

describe("structuredAnalysisResponse", () => {
  it.each(providerResponseCases)(
    "rebuilds word tokens from compact $provider output",
    async ({ createResponse, parseResponse }) => {
      const response = createResponse(compactAnalyzeResponse);
      const analysis = await parseResponse(response);

      expect(analysis).toMatchObject({
        status: "analyzable",
        result: {
          sentences: [
            {
              tokens: [
                { text: "Careful", vocabularyKey: "v1" },
                { text: "tests", vocabularyKey: "v2" },
              ],
            },
          ],
        },
      });
      expect(analysis).not.toHaveProperty("reason");
    },
  );

  it.each(providerResponseCases)(
    "uses a valid result object when the compact $provider status disagrees",
    async ({ createResponse, parseResponse }) => {
      const response = createResponse({
        ...compactAnalyzeResponse,
        status: "not_analyzable",
      });

      await expect(parseResponse(response)).resolves.toMatchObject({
        status: "analyzable",
        result: {
          translation: compactAnalyzeResponse.result.translation,
        },
      });
    },
  );

  it.each(providerResponseCases)(
    "preserves a genuine compact $provider not-analyzable response",
    async ({ createResponse, parseResponse }) => {
      const response = createResponse({
        reason: "영어 학습 입력이 아닙니다.",
        result: null,
        status: "not_analyzable",
      });

      await expect(parseResponse(response)).resolves.toEqual({
        reason: "영어 학습 입력이 아닙니다.",
        status: "not_analyzable",
      });
    },
  );
});
