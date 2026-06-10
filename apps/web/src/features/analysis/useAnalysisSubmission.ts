"use client";

import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  normalizeAnalysisText,
} from "@nado/shared";
import { analyzeText } from "./analysisApi";
import type { AnalysisState, AnalysisStateStore } from "./analysisState";
import { getCurrentAccessToken } from "../auth/authClient";

type UseAnalysisSubmissionOptions = {
  analysisState: AnalysisState;
  store: AnalysisStateStore;
  text: string;
};

export function useAnalysisSubmission({
  analysisState,
  store,
  text,
}: UseAnalysisSubmissionOptions) {
  return async function submitAnalysis() {
    const nextText = normalizeAnalysisText(text);
    const nextTextLength = countAnalysisTextCharacters(nextText);

    if (
      analysisState.status === "loading" ||
      nextTextLength === 0 ||
      nextTextLength > MAX_ANALYSIS_TEXT_LENGTH ||
      hasUnsupportedAnalysisTextCharacters(nextText)
    ) {
      return;
    }

    store.setAnalysisState({ status: "loading" });
    store.setVocabularySaveMessage(null);
    store.setVocabularySaveStates({});
    const nextAnalysisState = await analyzeText(nextText, {
      accessToken: await getCurrentAccessToken(),
    });

    if (nextAnalysisState.status === "success") {
      store.setText("");
    }

    store.setAnalysisState(nextAnalysisState);
  };
}
