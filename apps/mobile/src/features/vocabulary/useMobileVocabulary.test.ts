import { describe, expect, it } from "vitest";
import type { VocabularyItem } from "@nado/shared";
import {
  addMobileVocabularySavingKey,
  applyDeleteVocabularyError,
  createMobileVocabularySuggestionKey,
  isMobileVocabularySuggestionSaved,
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
      createMobileVocabularySuggestionKey({
        meaning: "피해야 할 것",
        term: "what to avoid",
        type: "phrase",
      }),
    ).toBe("phrase:what to avoid:피해야 할 것");
  });

  it("detects already saved suggestions by term and type", () => {
    expect(
      isMobileVocabularySuggestionSaved([savedItem], {
        meaning: "다른 뜻",
        term: "Wondering",
        type: "word",
      }),
    ).toBe(true);
  });
});
