import { describe, expect, it } from "vitest";
import type { VocabularyItem } from "@nado/shared";
import { applyDeleteVocabularyError } from "./mobileVocabularyState";

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
