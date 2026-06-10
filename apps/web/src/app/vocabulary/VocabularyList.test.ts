import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vocabularyListSource = readFileSync(
  new URL("./VocabularyList.tsx", import.meta.url),
  "utf8",
);

describe("VocabularyList source", () => {
  it("resets scroll position when vocabulary pagination changes page", () => {
    expect(vocabularyListSource).toContain("moveVocabularyPage");
    expect(vocabularyListSource).toContain("event.currentTarget.closest");
    expect(vocabularyListSource).toContain(".nado-content-workspace");
    expect(vocabularyListSource).toContain("moveVocabularyPage(");
  });
});
