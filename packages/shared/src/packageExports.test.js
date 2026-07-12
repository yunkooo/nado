import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as shared from "./index.ts";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

const legacyRootRuntimeExports = [
  "ANALYSIS_ERROR_MESSAGES",
  "ANALYSIS_MODELS",
  "DEFAULT_ANALYSIS_MODEL_ID",
  "DEFAULT_API_REQUEST_TIMEOUT_MS",
  "MAX_ANALYSIS_TEXT_LENGTH",
  "VOCABULARY_LIFECYCLE_REFRESH_STALE_MS",
  "VOCABULARY_MANUAL_REFRESH_THROTTLE_MS",
  "VOCABULARY_PAGE_SIZE",
  "VOCABULARY_REALTIME_REFRESH_DEBOUNCE_MS",
  "VOCABULARY_REALTIME_TOPIC_PREFIX",
  "analysisChunkSchema",
  "analysisGrammarPointSchema",
  "analysisModelIdSchema",
  "analysisResultSchema",
  "analysisSentenceSchema",
  "analysisStructureItemSchema",
  "analysisTokenSchema",
  "analysisVocabularyItemSchema",
  "analysisVocabularySuggestionSchema",
  "analyzeRequestSchema",
  "analyzeResponseJsonSchema",
  "analyzeResponseSchema",
  "apiErrorDetailSchema",
  "apiErrorResponseSchema",
  "countAnalysisTextCharacters",
  "createVocabularyMeaningRenderKey",
  "createVocabularyRealtimeRefreshScheduler",
  "createVocabularyRealtimeTopic",
  "errorCodeSchema",
  "fetchWithTimeout",
  "getDistinctVocabularyNote",
  "hasUnsupportedAnalysisTextCharacters",
  "isCurrentUserScopedRequest",
  "isLikelyEnglishLearningText",
  "isOpenRouterAnalysisModelId",
  "isVocabularyRealtimeTopicForUser",
  "moveVocabularyPage",
  "normalizeAnalysisText",
  "normalizeVocabularyTerm",
  "paginateVocabularyItems",
  "parseAnalyzeRequest",
  "readApiErrorDetail",
  "readApiErrorMessage",
  "readJson",
  "resetVocabularyPaginationScroll",
  "saveVocabularyRequestSchema",
  "saveVocabularyResponseSchema",
  "shouldApplyUserScopedMutation",
  "shouldRefreshVocabularyFromLifecycle",
  "shouldStartVocabularyManualRefresh",
  "vocabularyItemSchema",
  "vocabularyListResponseSchema",
  "vocabularyMeaningSchema",
  "vocabularyTypeSchema",
];

describe("@nado/shared package exports", () => {
  it("points development imports at source while keeping production imports on dist", () => {
    expect(packageJson.exports["."].development).toBe("./src/index.ts");
    expect(packageJson.exports["."].import).toBe("./dist/index.js");
    expect(Object.keys(packageJson.exports)).toEqual([
      ".",
      "./analysis",
      "./analysis-input",
      "./analysis-presentation",
      "./analysis-state",
      "./api-errors",
      "./http",
      "./review",
      "./user-scope",
      "./vocabulary",
      "./vocabulary-pagination",
      "./vocabulary-realtime",
      "./vocabulary-state",
    ]);

    for (const contract of Object.values(packageJson.exports)) {
      expect(contract.development).toMatch(/^\.\/src\/.+\.ts$/);
      expect(contract.import).toMatch(/^\.\/dist\/.+\.js$/);
    }
  });

  it("keeps the legacy root runtime surface additive", () => {
    expect(Object.keys(shared)).toEqual(
      expect.arrayContaining(legacyRootRuntimeExports),
    );
  });
});
