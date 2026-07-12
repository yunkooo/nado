import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vocabularyHookSource = readSource("./useMobileVocabulary.ts");
const loaderSource = readSource("./useMobileVocabularyLoader.ts");
const loadCoordinatorSource = readSource(
  "./mobileVocabularyLoadCoordinator.ts",
);
const manualRefreshSource = readSource("./useMobileVocabularyManualRefresh.ts");
const mutationsSource = readSource("./useMobileVocabularyMutations.ts");

describe("mobile vocabulary hook boundaries", () => {
  it("keeps the public hook as a small composition boundary", () => {
    expect(vocabularyHookSource.split("\n").length).toBeLessThanOrEqual(350);
    expect(vocabularyHookSource).toContain("useMobileVocabularyLoader");
    expect(vocabularyHookSource).toContain("useMobileVocabularyManualRefresh");
    expect(vocabularyHookSource).toContain("useMobileVocabularyMutations");
    expect(vocabularyHookSource).not.toContain("listVocabulary(");
    expect(vocabularyHookSource).not.toContain("deleteVocabularyItem(");
  });

  it("keeps load lifecycle, manual presentation, and mutations independent", () => {
    expect(loaderSource).toContain("listVocabulary(");
    expect(loaderSource).toContain("useMobileVocabularyRealtimeSync");
    expect(manualRefreshSource).toContain("shouldStartVocabularyManualRefresh");
    expect(mutationsSource).toContain("deleteVocabularyItem(");
    expect(mutationsSource).toContain("saveVocabularyItem(");
  });

  it("continues using the shared suggestion and realtime contracts", () => {
    expect(mutationsSource).toContain("createVocabularySuggestionKey");
    expect(mutationsSource).toContain("isVocabularySuggestionSaved");
    expect(loaderSource).toContain("shouldRefreshVocabularyFromLifecycle");
    expect(loaderSource).toContain("createMobileVocabularyLoadCoordinator");
    expect(loadCoordinatorSource).toContain("pendingForcedRefresh");
    expect(manualRefreshSource).toContain(
      "VOCABULARY_MANUAL_REFRESH_THROTTLE_MS",
    );
  });
});

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}
