import { describe, expect, it } from "vitest";
import {
  createVocabularySuggestionKey,
  isVocabularySuggestionSaved,
  type VocabularyItem,
} from "@nado/shared/vocabulary";
import {
  addMobileVocabularySavingKey,
  addMobileVocabularyDeletingId,
  addMobileVocabularyDeletingKey,
  applyDeleteVocabularyError,
  removeMobileVocabularyDeletingId,
  removeMobileVocabularyDeletingKey,
  removeMobileVocabularySavingKey,
  upsertMobileVocabularyItem,
} from "./mobileVocabularyState";

const savedItem: VocabularyItem = {
  createdAt: "2026-06-10T00:00:00.000Z",
  id: "item-1",
  meanings: [{ meaning: "궁금해하다", note: "정중한 표현" }],
  term: "wondering",
  type: "word",
  updatedAt: "2026-06-10T00:00:00.000Z",
};

describe("applyDeleteVocabularyError", () => {
  it("keeps the current list visible when deleting one item fails", () => {
    expect(
      applyDeleteVocabularyError(
        {
          items: [savedItem],
          message: null,
          status: "ready",
        },
        "삭제하지 못했어요.",
      ),
    ).toEqual({
      items: [savedItem],
      message: "삭제하지 못했어요.",
      status: "ready",
    });
  });

  it("uses an error panel when there is no list to preserve", () => {
    expect(
      applyDeleteVocabularyError(
        {
          items: [],
          message: null,
          status: "ready",
        },
        "삭제하지 못했어요.",
      ),
    ).toEqual({
      items: [],
      message: "삭제하지 못했어요.",
      status: "error",
    });
  });
});

describe("upsertMobileVocabularyItem", () => {
  it("adds a newly saved item to the top of the visible list", () => {
    const nextItem: VocabularyItem = {
      ...savedItem,
      id: "item-2",
      term: "avoid",
    };

    expect(
      upsertMobileVocabularyItem(
        {
          items: [savedItem],
          message: null,
          status: "ready",
        },
        nextItem,
      ),
    ).toEqual({
      items: [nextItem, savedItem],
      message: null,
      status: "ready",
    });
  });

  it("replaces an existing saved item without duplicating it", () => {
    const updatedItem: VocabularyItem = {
      ...savedItem,
      meanings: [{ meaning: "궁금하다", note: "업데이트된 설명" }],
    };

    expect(
      upsertMobileVocabularyItem(
        {
          items: [savedItem],
          message: null,
          status: "ready",
        },
        updatedItem,
      ).items,
    ).toEqual([updatedItem]);
  });
});

describe("mobile vocabulary suggestion helpers", () => {
  it("keeps every in-flight vocabulary save key", () => {
    const savingKeys = addMobileVocabularySavingKey(
      new Set(["word:wondering:궁금해하다"]),
      "phrase:take a look:살펴보다",
    );

    expect([...savingKeys]).toEqual([
      "word:wondering:궁금해하다",
      "phrase:take a look:살펴보다",
    ]);
    expect([
      ...removeMobileVocabularySavingKey(
        savingKeys,
        "word:wondering:궁금해하다",
      ),
    ]).toEqual(["phrase:take a look:살펴보다"]);
  });

  it("uses a stable key for pending save state", () => {
    expect(
      createVocabularySuggestionKey({
        meaning: "피해야 할 것",
        term: "what to avoid",
        type: "phrase",
      }),
    ).toBe('["phrase","what to avoid","피해야 할 것",""]');
  });

  it("detects an already saved suggestion by term, type, meaning, and note", () => {
    expect(
      isVocabularySuggestionSaved([savedItem], {
        meaning: "궁금해하다",
        note: "정중한 표현",
        term: "Wondering",
        type: "word",
      }),
    ).toBe(true);
  });

  it("uses the shared term normalization for repeated whitespace", () => {
    expect(
      isVocabularySuggestionSaved(
        [
          {
            ...savedItem,
            term: "take a look",
            type: "phrase",
          },
        ],
        {
          meaning: "궁금해하다",
          note: "정중한 표현",
          term: "  TAKE   A   LOOK  ",
          type: "phrase",
        },
      ),
    ).toBe(true);
  });

  it("allows another meaning or note pair for an existing term", () => {
    expect(
      isVocabularySuggestionSaved([savedItem], {
        meaning: "다른 뜻",
        term: "Wondering",
        type: "word",
      }),
    ).toBe(false);
    expect(
      isVocabularySuggestionSaved([savedItem], {
        meaning: "궁금해하다",
        term: "Wondering",
        type: "word",
      }),
    ).toBe(false);
  });
});

describe("mobile vocabulary deletion helpers", () => {
  it("tracks concurrent deletions independently", () => {
    const deletingIds = addMobileVocabularyDeletingId(
      new Set(["item-1"]),
      "item-2",
    );

    expect([...deletingIds]).toEqual(["item-1", "item-2"]);
    expect([
      ...removeMobileVocabularyDeletingId(deletingIds, "item-1"),
    ]).toEqual(["item-2"]);
  });

  it("tracks the exact meaning deletion shown in the UI", () => {
    const deletingKeys = addMobileVocabularyDeletingKey(
      new Set(["item-1:상태"]),
      "item-2:지역 주",
    );

    expect([...deletingKeys]).toEqual(["item-1:상태", "item-2:지역 주"]);
    expect([
      ...removeMobileVocabularyDeletingKey(deletingKeys, "item-1:상태"),
    ]).toEqual(["item-2:지역 주"]);
  });
});
