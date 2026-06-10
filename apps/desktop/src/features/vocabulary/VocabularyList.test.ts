import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { VocabularyItem } from "@nado/shared";
import { describe, expect, it } from "vitest";
import { VocabularyList } from "./VocabularyList";

const vocabularyItem: VocabularyItem = {
  createdAt: "2026-06-09T00:00:00.000Z",
  id: "row_1",
  meanings: [
    {
      createdAt: "2026-06-09T00:00:00.000Z",
      meaning: "~한 후에",
    },
  ],
  term: "after",
  type: "phrase",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

describe("desktop VocabularyList", () => {
  it("shows delete failures without replacing the vocabulary list", () => {
    const markup = renderToStaticMarkup(
      createElement(VocabularyList, {
        deleteMessage:
          "단어장 항목을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        deletingItemId: null,
        isLoading: false,
        items: [vocabularyItem],
        onDeleteItem: () => undefined,
      }),
    );

    expect(markup).toContain("after");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("단어장 항목을 삭제하지 못했어요.");
    expect(markup).not.toContain("단어장을 불러오지 못했어요");
  });
});
