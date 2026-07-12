"use client";

import { useEffect, useRef } from "react";
import {
  MAX_ANALYSIS_TEXT_LENGTH,
  countAnalysisTextCharacters,
  hasUnsupportedAnalysisTextCharacters,
  normalizeAnalysisText,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import { isCurrentUserScopedRequest } from "@nado/shared/user-scope";
import { analyzeText } from "./analysisApi";
import type { AnalysisState, AnalysisStateStore } from "./analysisState";
import { getCurrentAccessToken } from "../auth/authClient";

type UseAnalysisSubmissionOptions = {
  analysisState: AnalysisState;
  selectedAnalysisModel: AnalysisModelId;
  store: AnalysisStateStore;
  text: string;
  userId: string | null;
};

export function useAnalysisSubmission({
  analysisState,
  selectedAnalysisModel,
  store,
  text,
  userId,
}: UseAnalysisSubmissionOptions) {
  const latestRequestIdRef = useRef(0);
  const latestUserIdRef = useRef(userId);

  useEffect(() => {
    latestUserIdRef.current = userId;
    latestRequestIdRef.current += 1;
  }, [userId]);

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
    const requestId = latestRequestIdRef.current + 1;
    const requestUserId = userId;
    latestRequestIdRef.current = requestId;
    const accessToken = await getCurrentAccessToken();

    if (
      !isCurrentUserScopedRequest(
        requestUserId,
        latestUserIdRef.current,
        requestId,
        latestRequestIdRef.current,
      )
    ) {
      return;
    }

    const nextAnalysisState = await analyzeText(nextText, {
      accessToken,
      model: selectedAnalysisModel,
    });

    if (
      !isCurrentUserScopedRequest(
        requestUserId,
        latestUserIdRef.current,
        requestId,
        latestRequestIdRef.current,
      )
    ) {
      return;
    }

    if (nextAnalysisState.status === "success") {
      store.setText("");
    }

    store.setAnalysisState(nextAnalysisState);
  };
}
