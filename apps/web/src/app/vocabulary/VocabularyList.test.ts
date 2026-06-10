import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vocabularyListSource = readFileSync(
  new URL("./VocabularyList.tsx", import.meta.url),
  "utf8",
);

describe("VocabularyList source", () => {
  it("resets scroll position when vocabulary pagination changes page", () => {
    expect(vocabularyListSource).toContain("moveVocabularyPage");
    expect(vocabularyListSource).toContain(
      "moveVocabularyPage(pagination.currentPage - 1, setPage)",
    );
    expect(vocabularyListSource).toContain(
      "moveVocabularyPage(pagination.currentPage + 1, setPage)",
    );
  });
});
