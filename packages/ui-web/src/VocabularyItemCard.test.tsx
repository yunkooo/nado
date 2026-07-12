import { renderToStaticMarkup } from "react-dom/server";
import { createVocabularyMeaningMutationKey } from "@nado/shared/vocabulary";
import { describe, expect, it } from "vitest";
import { formatVocabularyDate, VocabularyItemCard } from "./VocabularyItemCard";

const item = {
  createdAt: "2026-07-10T00:00:00.000Z",
  id: "vocabulary-1",
  meanings: [
    { meaning: "출시", note: "출시" },
    { meaning: "배포", note: "제품을 사용자에게 전달함" },
  ],
  term: "shipping",
  type: "word" as const,
  updatedAt: "2026-07-11T00:00:00.000Z",
};

describe("VocabularyItemCard", () => {
  it("renders meanings and hides a duplicate note", () => {
    const markup = renderToStaticMarkup(
      <VocabularyItemCard
        deletingMeaningKeys={new Set()}
        item={item}
        onDeleteMeaning={() => undefined}
      />,
    );

    expect(markup).toContain("shipping");
    expect(markup).toContain("제품을 사용자에게 전달함");
    expect(markup).not.toContain("<small>출시</small>");
    expect(markup).toContain('aria-label="shipping의 출시 뜻 삭제"');
    expect(markup).toContain(">×</span>");
    expect(markup).not.toContain(">삭제</button>");
  });

  it("disables the delete action while deletion is running", () => {
    const markup = renderToStaticMarkup(
      <VocabularyItemCard
        deletingMeaningKeys={
          new Set([
            createVocabularyMeaningMutationKey(item.id, item.meanings[0]!),
          ])
        }
        item={item}
        onDeleteMeaning={() => undefined}
      />,
    );

    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain(">…</span>");
  });

  it("keeps invalid date text and formats valid dates", () => {
    expect(formatVocabularyDate("invalid-date")).toBe("invalid-date");
    expect(formatVocabularyDate("2026-07-11T00:00:00.000Z")).toMatch(
      /^2026\.07\.(10|11)$/,
    );
  });
});
