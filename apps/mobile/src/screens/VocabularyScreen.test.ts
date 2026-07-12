import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vocabularyScreenSource = readFileSync(
  new URL("./VocabularyScreen.tsx", import.meta.url),
  "utf8",
);

describe("VocabularyScreen meaning deletion", () => {
  it("renders a meaning-scoped delete action instead of a card delete action", () => {
    expect(vocabularyScreenSource).toContain(
      "createVocabularyMeaningMutationKey",
    );
    expect(vocabularyScreenSource).toContain(
      "onDeleteMeaning(item.id, meaning)",
    );
    expect(vocabularyScreenSource).toContain("뜻 삭제");
    expect(vocabularyScreenSource).not.toContain("onDeleteItem");
  });
});
