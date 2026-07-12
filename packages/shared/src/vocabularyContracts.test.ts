import { describe, expect, it } from "vitest";
import {
  MAX_VOCABULARY_MEANING_LENGTH,
  MAX_VOCABULARY_NOTE_LENGTH,
  MAX_VOCABULARY_TERM_LENGTH,
  createVocabularyMeaningRenderKey,
  createVocabularySuggestionKey,
  getDistinctVocabularyNote,
  isVocabularySuggestionSaved,
  normalizeVocabularyTerm,
  saveVocabularyRequestSchema,
  vocabularyMeaningSchema,
} from "./vocabularyContracts";

describe("normalizeVocabularyTerm", () => {
  it("normalizes case and repeated spaces", () => {
    expect(normalizeVocabularyTerm("  Wonder   If  ")).toBe("wonder if");
  });
});

describe("createVocabularyMeaningRenderKey", () => {
  it("keeps duplicate meanings renderable with unique keys", () => {
    const duplicateMeaning = {
      createdAt: "2026-06-10T00:00:00.000Z",
      meaning: "상태",
    };

    expect([
      createVocabularyMeaningRenderKey("row_1", duplicateMeaning, 0),
      createVocabularyMeaningRenderKey("row_1", duplicateMeaning, 1),
    ]).toEqual([
      "row_1-2026-06-10T00:00:00.000Z-상태-0",
      "row_1-2026-06-10T00:00:00.000Z-상태-1",
    ]);
  });
});

describe("getDistinctVocabularyNote", () => {
  it("keeps notes that add context beyond the meaning", () => {
    expect(
      getDistinctVocabularyNote("일정이나 계획을 확인할 때 자주 씁니다.", [
        "검토하다",
        "go over",
      ]),
    ).toBe("일정이나 계획을 확인할 때 자주 씁니다.");
  });

  it("removes notes that repeat the answer or prompt text", () => {
    expect(getDistinctVocabularyNote(" 피하다 ", ["피하다", "avoid"])).toBe("");
    expect(getDistinctVocabularyNote(" Avoid ", ["피하다", "avoid"])).toBe("");
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

  it("drops duplicate vocabulary notes that repeat the meaning", () => {
    expect(
      saveVocabularyRequestSchema.parse({
        term: "avoid",
        type: "word",
        meaning: "피하다",
        note: " 피하다 ",
      }),
    ).toEqual({
      term: "avoid",
      type: "word",
      meaning: "피하다",
    });
  });

  it("rejects oversized vocabulary fields", () => {
    expect(
      saveVocabularyRequestSchema.safeParse({
        meaning: "뜻",
        term: "a".repeat(MAX_VOCABULARY_TERM_LENGTH + 1),
        type: "word",
      }).success,
    ).toBe(false);
    expect(
      saveVocabularyRequestSchema.safeParse({
        meaning: "가".repeat(MAX_VOCABULARY_MEANING_LENGTH + 1),
        term: "word",
        type: "word",
      }).success,
    ).toBe(false);
    expect(
      saveVocabularyRequestSchema.safeParse({
        meaning: "뜻",
        note: "나".repeat(MAX_VOCABULARY_NOTE_LENGTH + 1),
        term: "word",
        type: "word",
      }).success,
    ).toBe(false);
  });

  it("keeps legacy stored meanings readable while rejecting new oversized saves", () => {
    const legacyMeaning = {
      meaning: "가".repeat(MAX_VOCABULARY_MEANING_LENGTH + 1),
      note: "나".repeat(MAX_VOCABULARY_NOTE_LENGTH + 1),
    };

    expect(vocabularyMeaningSchema.safeParse(legacyMeaning).success).toBe(true);
    expect(
      saveVocabularyRequestSchema.safeParse({
        ...legacyMeaning,
        term: "word",
        type: "word",
      }).success,
    ).toBe(false);
  });
});

describe("isVocabularySuggestionSaved", () => {
  it("uses the same whitespace and case normalization on every platform", () => {
    expect(
      isVocabularySuggestionSaved(
        [
          {
            createdAt: "2026-06-09T00:00:00.000Z",
            id: "phrase-1",
            meanings: [{ meaning: "돌보다" }],
            term: "Take   Care Of",
            type: "phrase",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
        ],
        { meaning: "돌보다", term: " take care of ", type: "phrase" },
      ),
    ).toBe(true);
  });
});

describe("createVocabularySuggestionKey", () => {
  it("uses an unambiguous JSON tuple including the note", () => {
    expect(
      createVocabularySuggestionKey({
        meaning: "뜻:설명",
        note: "문맥:A",
        term: "term:part",
        type: "phrase",
      }),
    ).toBe('["phrase","term:part","뜻:설명","문맥:A"]');

    expect(
      createVocabularySuggestionKey({
        meaning: "뜻:설명",
        note: "문맥:B",
        term: "term:part",
        type: "phrase",
      }),
    ).not.toBe(
      createVocabularySuggestionKey({
        meaning: "뜻:설명",
        note: "문맥:A",
        term: "term:part",
        type: "phrase",
      }),
    );
  });

  it("does not collide when tuple segments contain separators", () => {
    expect(
      createVocabularySuggestionKey({
        meaning: "c",
        term: "a:b",
        type: "word",
      }),
    ).not.toBe(
      createVocabularySuggestionKey({
        meaning: "b:c",
        term: "a",
        type: "word",
      }),
    );
  });
});
