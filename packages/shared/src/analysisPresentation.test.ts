import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "./analysisContracts";
import {
  isAnalysisPresentationResult,
  mapAnalysisResultToPresentation,
} from "./analysisPresentation";

const apiResult: AnalysisResult = {
  grammarPoints: [],
  sentences: [
    {
      chunks: [
        {
          english: "I leave home",
          literalTranslation: "나는 집을 나선다",
          role: "주절",
        },
      ],
      explanation: "현재의 반복을 설명한다.",
      grammarPoints: [
        {
          explanation: "반복되는 행동을 나타낸다.",
          grammarType: undefined,
          title: "leave",
        },
      ],
      source: "I leave home.",
      tokens: [{ text: "leave", vocabularyKey: "leave" }],
      translation: "나는 집을 나선다.",
    },
  ],
  structure: [
    {
      english: "leave home",
      korean: "집을 나서다",
      note: "동사구",
    },
  ],
  translation: "나는 집을 나선다.",
  translationExplanation: "자연스러운 현재형 번역이다.",
  vocabularyItems: [
    {
      baseForm: "leave",
      contextMeaning: "집을 나서다",
      key: "leave",
      meaning: "떠나다",
      partOfSpeech: "verb",
      saveLabel: "저장",
      term: "leave",
      type: "word",
    },
  ],
  vocabularySuggestions: [],
};

describe("analysis presentation contract", () => {
  it("maps one API result into the shared client presentation", () => {
    const presentation = mapAnalysisResultToPresentation(
      "I leave home.",
      apiResult,
    );

    expect(presentation).toMatchObject({
      sentences: [
        {
          chunks: [
            {
              english: "I leave home",
              korean: "나는 집을 나선다",
            },
          ],
          grammarPoints: [{ target: "leave", type: "문법 포인트" }],
          indexLabel: "문장 1",
        },
      ],
      sourceText: "I leave home.",
      translation: ["나는 집을 나선다."],
      translationNotes: [
        { term: "번역 포인트" },
        { note: "집을 나서다 · 동사구", term: "leave home" },
      ],
      vocabularySuggestions: [
        {
          meaning: "떠나다",
          note: "집을 나서다",
          term: "leave",
          type: "word",
        },
      ],
    });
    expect(isAnalysisPresentationResult(presentation)).toBe(true);
  });

  it("rejects malformed persisted presentation data", () => {
    const presentation = mapAnalysisResultToPresentation(
      "I leave home.",
      apiResult,
    );

    expect(
      isAnalysisPresentationResult({
        ...presentation,
        translation: "나는 집을 나선다.",
      }),
    ).toBe(false);
  });
});
