import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODEL_ID,
  analysisModelIdSchema,
  type AnalysisModelId,
} from "@nado/shared/analysis-input";
import { isCurrentUserScopedRequest } from "@nado/shared/user-scope";
import { analyzeText, type AnalyzeTextResult } from "../../api/analysisApi";
import { readMobileApiBaseUrl } from "../../api/apiConfig";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  INITIAL_ANALYSIS_TEXT,
  getAnalysisComposerState,
  resolveAnalysisInputAfterSuccess,
} from "./analysisScreen";

export type MobileAnalysisState =
  | AnalyzeTextResult
  | { status: "idle" | "loading" };

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;
const MOBILE_ANALYSIS_MODEL_STORAGE_KEY = "nado.mobile.analysis-model.v1";

export function useMobileAnalysisController(
  authState: MobileAuthStateSnapshot,
) {
  const [text, setText] = useState(INITIAL_ANALYSIS_TEXT);
  const [selectedModel, setSelectedModel] = useState<AnalysisModelId>(
    DEFAULT_ANALYSIS_MODEL_ID,
  );
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [analysisState, setAnalysisState] = useState<MobileAnalysisState>({
    status: "idle",
  });
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const currentUserId = authState.session?.user.id ?? null;
  const latestUserIdRef = useRef(currentUserId);
  const previousUserIdRef = useRef(currentUserId);
  const isScopeCurrent =
    authState.status !== "loading" && ownerUserId === currentUserId;
  const visibleState = isScopeCurrent
    ? analysisState
    : ({ status: "idle" } as const);
  const visibleText = isScopeCurrent ? text : INITIAL_ANALYSIS_TEXT;
  const composerState = getAnalysisComposerState(visibleText);
  const isLoading = visibleState.status === "loading";
  const selectedModelLabel =
    ANALYSIS_MODELS.find((model) => model.id === selectedModel)?.label ??
    ANALYSIS_MODELS[0].label;

  useLayoutEffect(() => {
    latestUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(MOBILE_ANALYSIS_MODEL_STORAGE_KEY)
      .then((value) => {
        if (isMounted && isAnalysisModelId(value)) {
          setSelectedModel(value);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (authState.status === "loading") {
      return;
    }

    if (previousUserIdRef.current !== currentUserId) {
      requestIdRef.current += 1;
      setOwnerUserId(currentUserId);
      setAnalysisState({ status: "idle" });
      setText(INITIAL_ANALYSIS_TEXT);
    }

    previousUserIdRef.current = currentUserId;
  }, [authState.status, currentUserId]);

  const changeText = (nextText: string) => {
    if (!isScopeCurrent) {
      setOwnerUserId(currentUserId);
      setAnalysisState({ status: "idle" });
    }

    setText(nextText);

    if (!isLoading) {
      setAnalysisState({ status: "idle" });
    }
  };

  const selectModel = (modelId: AnalysisModelId) => {
    setSelectedModel(modelId);
    setIsModelSelectorOpen(false);
    void AsyncStorage.setItem(MOBILE_ANALYSIS_MODEL_STORAGE_KEY, modelId).catch(
      () => undefined,
    );
  };

  const analyze = async () => {
    const submittedInput = visibleText;
    const trimmedText = visibleText.trim();

    if (trimmedText.length === 0 || isLoading) {
      return;
    }

    setAnalysisState({ status: "loading" });
    const requestId = requestIdRef.current + 1;
    const requestUserId = currentUserId;
    requestIdRef.current = requestId;
    setOwnerUserId(requestUserId);

    const nextState = await analyzeText(trimmedText, {
      accessToken: authState.accessToken,
      apiBaseUrl: configuredMobileApiBaseUrl,
      apiPlatform: configuredMobileApiPlatform,
      model: selectedModel,
    });

    if (
      !isCurrentUserScopedRequest(
        requestUserId,
        latestUserIdRef.current,
        requestId,
        requestIdRef.current,
      )
    ) {
      return;
    }

    setOwnerUserId(requestUserId);
    setAnalysisState(nextState);

    if (nextState.status === "success") {
      setText((currentText) =>
        resolveAnalysisInputAfterSuccess(currentText, submittedInput),
      );
    }
  };

  return {
    analyze,
    analysisState: visibleState,
    changeText,
    closeModelSelector: () => setIsModelSelectorOpen(false),
    composerState,
    isAnalyzeDisabled: composerState.isSubmitDisabled || isLoading,
    isAnalyzeVisuallyDisabled: composerState.isSubmitDisabled,
    isModelSelectorOpen,
    openModelSelector: () => setIsModelSelectorOpen(true),
    selectModel,
    selectedModel,
    selectedModelLabel,
    text: visibleText,
  };
}

function isAnalysisModelId(value: unknown): value is AnalysisModelId {
  return analysisModelIdSchema.safeParse(value).success;
}
