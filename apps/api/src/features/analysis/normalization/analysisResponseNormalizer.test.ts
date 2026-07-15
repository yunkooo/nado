import { describe, expect, it } from "vitest";
import type { AnalysisSentence, AnalyzeResponse } from "@nado/shared/analysis";
import {
  normalizeAnalysisChunks,
  normalizeOpenRouterAnalysisResponse,
} from "./analysisResponseNormalizer.js";

const baseSentence = {
  source: "I was wondering if you could help me.",
  translation: "도와주실 수 있는지 궁금합니다.",
  explanation: "도움을 정중하게 요청하는 문장입니다.",
  tokens: [
    { text: "I", vocabularyKey: "i" },
    { text: ".", vocabularyKey: null },
  ],
  chunks: [
    {
      english: "I was wondering if",
      literalTranslation: "제가 ~인지 궁금했습니다",
      role: "정중하게 질문을 시작합니다.",
    },
  ],
  grammarPoints: [],
} satisfies AnalysisSentence;

const baseAnalyzeResponse = {
  status: "analyzable",
  result: {
    translation: "도와주실 수 있는지 궁금합니다.",
    translationExplanation: "정중한 요청 표현입니다.",
    sentences: [baseSentence],
    structure: [],
    grammarPoints: [],
    vocabularyItems: [],
    vocabularySuggestions: [],
  },
} satisfies AnalyzeResponse;

describe("analysisResponseNormalizer", () => {
  it("supplements OpenRouter sentence tokens from vocabulary items when model output omits token links", () => {
    const responseWithSparseTokens = {
      ...baseAnalyzeResponse,
      result: {
        ...baseAnalyzeResponse.result,
        translation:
          "빠른 상태 설계는 팀이 인터페이스 버그를 더 빨리 찾도록 돕습니다.",
        sentences: [
          {
            ...baseSentence,
            source: "Fast state design helps teams find interface bugs faster.",
            translation:
              "빠른 상태 설계는 팀이 인터페이스 버그를 더 빨리 찾도록 돕습니다.",
            tokens: [
              { text: "state", vocabularyKey: null },
              { text: "design", vocabularyKey: "existing-design" },
            ],
            chunks: [
              {
                english: "Fast state design",
                literalTranslation: "빠른 상태 설계는",
                role: "주어 역할을 합니다.",
              },
              {
                english: "helps teams find interface bugs faster",
                literalTranslation:
                  "팀이 인터페이스 버그를 더 빨리 찾도록 돕습니다",
                role: "서술부 역할을 합니다.",
              },
            ],
          },
        ],
        vocabularyItems: [
          {
            key: "state",
            term: "state",
            baseForm: "state",
            type: "word",
            partOfSpeech: "noun",
            meaning: "상태",
            contextMeaning: "컴포넌트가 기억하는 데이터 상태입니다.",
            saveLabel: "state",
          },
          {
            key: "existing-design",
            term: "design",
            baseForm: "design",
            type: "word",
            partOfSpeech: "noun",
            meaning: "설계",
            contextMeaning: "상태를 구성하는 방식입니다.",
            saveLabel: "design",
          },
          {
            key: "interface-bugs",
            term: "interface bugs",
            baseForm: "interface bug",
            type: "phrase",
            partOfSpeech: null,
            meaning: "인터페이스 버그",
            contextMeaning: "화면 동작에서 드러나는 문제입니다.",
            saveLabel: "interface bugs",
          },
          {
            key: "interface",
            term: "interface",
            baseForm: "interface",
            type: "word",
            partOfSpeech: "noun",
            meaning: "인터페이스",
            contextMeaning: "사용자와 맞닿는 화면 또는 접점을 뜻합니다.",
            saveLabel: "interface",
          },
          {
            key: "faster",
            term: "faster",
            baseForm: "fast",
            type: "word",
            partOfSpeech: "adverb",
            meaning: "더 빠르게",
            contextMeaning: "문제를 찾는 속도가 더 빠름을 뜻합니다.",
            saveLabel: "faster",
          },
          {
            key: "fast",
            term: "fast",
            baseForm: "fast",
            type: "word",
            partOfSpeech: "adjective",
            meaning: "빠른",
            contextMeaning: "상태 설계의 속도감이나 효율을 나타냅니다.",
            saveLabel: "fast",
          },
        ],
      },
    } satisfies AnalyzeResponse;

    expect(
      normalizeOpenRouterAnalysisResponse(responseWithSparseTokens),
    ).toMatchObject({
      result: {
        sentences: [
          {
            tokens: [
              { text: "Fast", vocabularyKey: "fast" },
              { text: "state", vocabularyKey: "state" },
              { text: "design", vocabularyKey: "existing-design" },
              { text: "helps", vocabularyKey: null },
              { text: "teams", vocabularyKey: null },
              { text: "find", vocabularyKey: null },
              { text: "interface", vocabularyKey: "interface" },
              { text: "bugs", vocabularyKey: "interface-bugs" },
              { text: "faster", vocabularyKey: "faster" },
            ],
          },
        ],
      },
    });
  });

  it("preserves null sentence tokens so duplicate words keep their keyed occurrence", () => {
    const responseWithDuplicateTokens = {
      ...baseAnalyzeResponse,
      result: {
        ...baseAnalyzeResponse.result,
        translation: "메아리처럼 반복한 뒤 리뷰를 개선합니다.",
        sentences: [
          {
            ...baseSentence,
            source: "Echo echo improves reviews.",
            translation: "메아리처럼 반복한 뒤 리뷰를 개선합니다.",
            tokens: [
              { text: "Echo", vocabularyKey: null },
              { text: "echo", vocabularyKey: "repeated-echo" },
              { text: "improves", vocabularyKey: null },
              { text: "reviews", vocabularyKey: null },
            ],
            chunks: [
              {
                english: "Echo echo",
                literalTranslation: "메아리처럼 반복한 뒤",
                role: "반복 표현입니다.",
              },
              {
                english: "improves reviews",
                literalTranslation: "리뷰를 개선합니다",
                role: "서술부입니다.",
              },
            ],
          },
        ],
        vocabularyItems: [
          {
            key: "repeated-echo",
            term: "repeated reference",
            baseForm: "repeated reference",
            type: "phrase",
            partOfSpeech: null,
            meaning: "반복 언급",
            contextMeaning: "두 번째 echo에만 연결된 저장 항목입니다.",
            saveLabel: "repeated reference",
          },
        ],
      },
    } satisfies AnalyzeResponse;

    expect(
      normalizeOpenRouterAnalysisResponse(responseWithDuplicateTokens),
    ).toMatchObject({
      result: {
        sentences: [
          {
            tokens: [
              { text: "Echo", vocabularyKey: null },
              { text: "echo", vocabularyKey: "repeated-echo" },
              { text: "improves", vocabularyKey: null },
              { text: "reviews", vocabularyKey: null },
            ],
          },
        ],
      },
    });
  });

  it("normalizes predicate adverb chunks so repeated analyses keep stable boundaries", () => {
    const responseWithSplitPredicate = {
      ...baseAnalyzeResponse,
      result: {
        ...baseAnalyzeResponse.result,
        translation: "의미 있는 변화는 종종 조용히 시작됩니다.",
        sentences: [
          {
            ...baseSentence,
            source: "That meaningful change often begins quietly.",
            translation: "의미 있는 변화는 종종 조용히 시작됩니다.",
            chunks: [
              {
                english: "That meaningful change",
                literalTranslation: "의미 있는 변화가",
                role: "주어 역할을 합니다.",
              },
              {
                english: "often begins quietly",
                literalTranslation: "종종 조용히 시작됩니다",
                role: "빈도 부사와 동사가 이어지는 서술부입니다.",
              },
            ],
          },
        ],
      },
    } satisfies AnalyzeResponse;

    expect(normalizeAnalysisChunks(responseWithSplitPredicate)).toMatchObject({
      result: {
        sentences: [
          {
            chunks: [
              {
                english: "That meaningful change often begins quietly",
                literalTranslation: "의미 있는 변화가 종종 조용히 시작됩니다",
              },
            ],
          },
        ],
      },
    });
  });
});
