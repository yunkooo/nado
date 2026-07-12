import { renderToStaticMarkup } from "react-dom/server";
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
        isDeleting={false}
        item={item}
        onDelete={() => undefined}
      />,
    );

    expect(markup).toContain("shipping");
    expect(markup).toContain("제품을 사용자에게 전달함");
    expect(markup.match(/출시/g)).toHaveLength(1);
    expect(markup).toContain(">삭제</button>");
  });

  it("disables the delete action while deletion is running", () => {
    const markup = renderToStaticMarkup(
      <VocabularyItemCard isDeleting item={item} onDelete={() => undefined} />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain("삭제 중");
  });

  it("keeps invalid date text and formats valid dates", () => {
    expect(formatVocabularyDate("invalid-date")).toBe("invalid-date");
    expect(formatVocabularyDate("2026-07-11T00:00:00.000Z")).toMatch(
      /^2026\.07\.(10|11)$/,
    );
  });
});
