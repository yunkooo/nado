import { describe, expect, it } from "vitest";
import {
  parseOpenAIAnalysisResponse,
  parseOpenRouterAnalysisResponse,
} from "./structuredAnalysisResponse.js";

const compactAnalyzeResponse = {
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

describe("structuredAnalysisResponse", () => {
  it.each([
    {
      parseResponse: parseOpenAIAnalysisResponse,
      provider: "OpenAI",
      response: new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: JSON.stringify(compactAnalyzeResponse),
                  type: "output_text",
                },
              ],
            },
          ],
        }),
      ),
    },
    {
      parseResponse: parseOpenRouterAnalysisResponse,
      provider: "OpenRouter",
      response: new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(compactAnalyzeResponse),
              },
            },
          ],
        }),
      ),
    },
  ])(
    "rebuilds word tokens from compact $provider output",
    async ({ parseResponse, response }) => {
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
    },
  );
});
