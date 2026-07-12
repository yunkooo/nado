import {
  DEFAULT_ANALYSIS_MODEL_ID,
  analysisModelIdSchema,
  type AnalysisModelId,
} from "./analysisInput.ts";
import {
  isAnalysisPresentationResult,
  type AnalysisPresentationResult,
  type VocabularySuggestionSaveState,
} from "./analysisPresentation.ts";

export type AnalysisClientError = {
  code?: string;
  message: string;
  requestId?: string;
  retryable?: boolean;
  status: "error";
  statusCode?: number;
};

export type AnalysisClientResult =
  | { data: AnalysisPresentationResult; status: "success" }
  | AnalysisClientError
  | { message: string; status: "not_analyzable" };

export type AnalysisState =
  | AnalysisClientResult
  | { status: "idle" | "loading" };

export type VocabularySaveNotice = {
  text: string;
  tone: "error" | "success";
};

export type AnalysisPageSnapshot = {
  analysisState: AnalysisState;
  ownerUserId: string | null;
  selectedAnalysisModel: AnalysisModelId;
  text: string;
  vocabularySaveMessage: VocabularySaveNotice | null;
  vocabularySaveStates: Record<string, VocabularySuggestionSaveState>;
};

export type PersistedAnalysisPageSnapshot = Omit<
  AnalysisPageSnapshot,
  "selectedAnalysisModel"
> & {
  selectedAnalysisModel?: AnalysisModelId;
};

export type AnalysisRequestScope = {
  requestId: number;
  userId: string | null;
};

export type AnalysisStateStorage = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

export function createInitialAnalysisPageSnapshot(): AnalysisPageSnapshot {
  return {
    analysisState: { status: "idle" },
    ownerUserId: null,
    selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
    text: "",
    vocabularySaveMessage: null,
    vocabularySaveStates: {},
  };
}

export function createPersistedAnalysisPageSnapshot(
  snapshot: AnalysisPageSnapshot,
): AnalysisPageSnapshot {
  return {
    ...snapshot,
    analysisState:
      snapshot.analysisState.status === "loading"
        ? { status: "idle" }
        : snapshot.analysisState,
    selectedAnalysisModel: isAnalysisModelId(snapshot.selectedAnalysisModel)
      ? snapshot.selectedAnalysisModel
      : DEFAULT_ANALYSIS_MODEL_ID,
    vocabularySaveMessage: null,
    vocabularySaveStates: {},
  };
}

export function normalizePersistedAnalysisPageSnapshot(
  snapshot: PersistedAnalysisPageSnapshot,
): AnalysisPageSnapshot {
  return createPersistedAnalysisPageSnapshot({
    ...snapshot,
    selectedAnalysisModel:
      snapshot.selectedAnalysisModel ?? DEFAULT_ANALYSIS_MODEL_ID,
  });
}

export function isAnalysisPageSnapshot(
  value: unknown,
): value is AnalysisPageSnapshot {
  return (
    isAnalysisPageSnapshotBase(value) &&
    isAnalysisModelId(value.selectedAnalysisModel)
  );
}

export function isPersistedAnalysisPageSnapshot(
  value: unknown,
): value is PersistedAnalysisPageSnapshot {
  return (
    isAnalysisPageSnapshotBase(value) &&
    (value.selectedAnalysisModel === undefined ||
      isAnalysisModelId(value.selectedAnalysisModel))
  );
}

export function isAnalysisModelId(value: unknown): value is AnalysisModelId {
  return analysisModelIdSchema.safeParse(value).success;
}

function isAnalysisPageSnapshotBase(value: unknown): value is Omit<
  AnalysisPageSnapshot,
  "selectedAnalysisModel"
> & {
  selectedAnalysisModel?: unknown;
} {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    (value.ownerUserId === null || typeof value.ownerUserId === "string") &&
    isAnalysisState(value.analysisState) &&
    (value.vocabularySaveMessage === null ||
      isVocabularySaveNotice(value.vocabularySaveMessage)) &&
    isVocabularySaveStates(value.vocabularySaveStates)
  );
}

function isAnalysisState(value: unknown): value is AnalysisState {
  if (!isRecord(value)) {
    return false;
  }

  if (value.status === "idle" || value.status === "loading") {
    return true;
  }

  if (value.status === "success") {
    return isAnalysisPresentationResult(value.data);
  }

  if (value.status === "not_analyzable") {
    return typeof value.message === "string";
  }

  return (
    value.status === "error" &&
    typeof value.message === "string" &&
    isOptionalString(value.code) &&
    isOptionalString(value.requestId) &&
    isOptionalBoolean(value.retryable) &&
    isOptionalNumber(value.statusCode)
  );
}

function isVocabularySaveStates(
  value: unknown,
): value is Record<string, VocabularySuggestionSaveState> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (state) => state === "idle" || state === "saved" || state === "saving",
    )
  );
}

function isVocabularySaveNotice(value: unknown): value is VocabularySaveNotice {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    (value.tone === "error" || value.tone === "success")
  );
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
