import { describe, expect, it } from "vitest";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  analyzeResponseJsonSchema,
  analyzeResponseSchema,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  isLikelyEnglishLearningText,
  normalizeAnalysisText,
  normalizeVocabularyTerm,
  parseAnalyzeRequest,
  saveVocabularyRequestSchema,
} from "./index";

describe("parseAnalyzeRequest", () => {
  it("keeps the MVP analysis input limit at 200 characters", () => {
    expect(MAX_ANALYSIS_TEXT_LENGTH).toBe(200);
  });

  it("trims valid analysis text", () => {
    expect(
      parseAnalyzeRequest({ text: "  I was wondering if you could help.  " }),
    ).toEqual({
      text: "I was wondering if you could help.",
    });
  });

  it("rejects blank analysis text", () => {
    expect(() => parseAnalyzeRequest({ text: "   " })).toThrow(
      "analysis.text.required",
    );
  });

  it("rejects text longer than the MVP limit", () => {
    expect(() =>
      parseAnalyzeRequest({ text: "a".repeat(MAX_ANALYSIS_TEXT_LENGTH + 1) }),
    ).toThrow("analysis.text.too_long");
  });

  it("normalizes compatible unicode before validating text", () => {
    expect(parseAnalyzeRequest({ text: "  Ｉ leave home．  " })).toEqual({
      text: "I leave home.",
    });
  });

  it("rejects invisible format characters", () => {
    expect(() => parseAnalyzeRequest({ text: "I\u200B leave home." })).toThrow(
      "analysis.text.unsupported_characters",
    );
  });

  it("rejects unsupported symbols even when the text is short", () => {
    expect(() => parseAnalyzeRequest({ text: "I leave home 💣" })).toThrow(
      "analysis.text.unsupported_characters",
    );
  });
});

describe("analysis text helpers", () => {
  it("counts normalized Unicode code points instead of UTF-16 units", () => {
    const normalized = normalizeAnalysisText("  Ｉ leave home．  ");

    expect(normalized).toBe("I leave home.");
    expect(countAnalysisTextCharacters("  Ｉ leave home．  ")).toBe(
      Array.from(normalized).length,
    );
  });

  it("detects control and format characters as unsupported", () => {
    expect(hasUnsupportedAnalysisTextCharacters("I\u202E leave home.")).toBe(
      true,
    );
    expect(hasUnsupportedAnalysisTextCharacters("I leave home.")).toBe(false);
  });
});

describe("normalizeVocabularyTerm", () => {
  it("normalizes case and repeated spaces", () => {
    expect(normalizeVocabularyTerm("  Wonder   If  ")).toBe("wonder if");
  });
});

describe("analyzeResponseSchema", () => {
  it("accepts the MVP structured analysis response", () => {
    const response = analyzeResponseSchema.parse({
      status: "analyzable",
      result: {
        translation: "이 문제를 도와주실 수 있는지 궁금합니다.",
        translationExplanation:
          "직접적인 질문보다 부드럽고 정중한 요청 표현입니다.",
        sentences: [
          {
            source: "I was wondering if you could help me with this issue.",
            translation: "이 문제를 도와주실 수 있는지 궁금합니다.",
            explanation: "정중하게 도움을 요청하는 문장입니다.",
            tokens: [
              { text: "I", vocabularyKey: "i" },
              { text: ".", vocabularyKey: null },
            ],
            chunks: [
              {
                english: "I was wondering if",
                literalTranslation: "제가 ~인지 궁금해하고 있었습니다",
                role: "정중하게 질문을 시작하는 부분입니다.",
              },
            ],
            grammarPoints: [
              {
                title: "was wondering if",
                grammarType: "정중한 요청 표현",
                explanation:
                  "직접적으로 묻기보다 부드럽고 정중하게 요청할 때 씁니다.",
              },
            ],
          },
        ],
        structure: [
          {
            english: "I was wondering if",
            korean: "~인지 궁금했습니다",
            note: "정중하게 부탁할 때 쓰는 시작 표현",
          },
        ],
        grammarPoints: [
          {
            title: "was wondering if",
            explanation: "직접적인 질문보다 부드러운 요청 표현입니다.",
          },
        ],
        vocabularyItems: [
          {
            key: "wonder",
            term: "wondering",
            baseForm: "wonder",
            type: "word",
            partOfSpeech: "verb",
            meaning: "궁금해하다",
            contextMeaning: "정중하게 질문이나 부탁을 꺼낼 때 쓰였습니다.",
            saveLabel: "wonder",
          },
        ],
        vocabularySuggestions: [
          {
            key: "wonder",
            term: "wonder",
            type: "word",
            meaning: "궁금해하다",
            note: "정중한 요청 표현에서 자주 보입니다.",
          },
        ],
      },
    });

    expect(response.status).toBe("analyzable");
  });

  it("rejects analysis responses without chunk literal translations", () => {
    expect(() =>
      analyzeResponseSchema.parse({
        status: "analyzable",
        result: {
          translation: "번역",
          translationExplanation: "설명",
          sentences: [
            {
              source: "Hello.",
              translation: "안녕하세요.",
              explanation: "인사입니다.",
              tokens: [{ text: "Hello", vocabularyKey: "hello" }],
              chunks: [{ english: "Hello", role: "인사 표현입니다." }],
              grammarPoints: [],
            },
          ],
          structure: [],
          grammarPoints: [],
          vocabularyItems: [],
          vocabularySuggestions: [],
        },
      }),
    ).toThrow();
  });

  it("accepts not-analyzable responses", () => {
    expect(
      analyzeResponseSchema.parse({
        status: "not_analyzable",
        reason: "영어 문장으로 분석하기 어려운 입력입니다.",
      }),
    ).toEqual({
      status: "not_analyzable",
      reason: "영어 문장으로 분석하기 어려운 입력입니다.",
    });
  });
});

describe("analyzeResponseJsonSchema", () => {
  it("uses an OpenAI structured-output compatible root object", () => {
    expect(analyzeResponseJsonSchema).toMatchObject({
      additionalProperties: false,
      type: "object",
    });
    expect(analyzeResponseJsonSchema).not.toHaveProperty("oneOf");
  });
});

describe("saveVocabularyRequestSchema", () => {
  it("trims a valid vocabulary save request", () => {
    expect(
      saveVocabularyRequestSchema.parse({
        term: "  wonder if  ",
        type: "phrase",
        meaning: "  ~인지 궁금하다  ",
        note: "  정중한 질문에서 자주 쓰입니다.  ",
      }),
    ).toEqual({
      term: "wonder if",
      type: "phrase",
      meaning: "~인지 궁금하다",
      note: "정중한 질문에서 자주 쓰입니다.",
    });
  });
});

describe("isLikelyEnglishLearningText", () => {
  it("accepts ordinary English sentences", () => {
    expect(
      isLikelyEnglishLearningText("I was wondering if you could help me."),
    ).toBe(true);
  });

  it("rejects mostly numeric or symbolic input", () => {
    expect(isLikelyEnglishLearningText("1234567890 !!!")).toBe(false);
  });

  it("rejects English-looking text with unsupported hidden characters", () => {
    expect(isLikelyEnglishLearningText("I\u200B leave home.")).toBe(false);
  });
});
