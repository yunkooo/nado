import type { AnalysisModelId } from "./analysisInput.ts";
import {
  createPersistedAnalysisPageSnapshot,
  isAnalysisModelId,
  isPersistedAnalysisPageSnapshot,
  normalizePersistedAnalysisPageSnapshot,
  type AnalysisPageSnapshot,
  type AnalysisStateStorage,
} from "./analysisStateContracts.ts";

const STORAGE_VERSION = 2;

export function persistAnalysisPageSnapshot(
  snapshot: AnalysisPageSnapshot,
  getStorage: () => AnalysisStateStorage | null,
  storageKey: string,
) {
  const storage = readAnalysisStorage(getStorage);

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      storageKey,
      JSON.stringify({
        snapshot: createPersistedAnalysisPageSnapshot(snapshot),
        version: STORAGE_VERSION,
      }),
    );
  } catch {
    removeAnalysisStorageItem(storage, storageKey);
  }
}

export function readPersistedAnalysisPageSnapshot(
  getStorage: () => AnalysisStateStorage | null,
  storageKey: string,
): AnalysisPageSnapshot | null {
  const storage = readAnalysisStorage(getStorage);

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(storageKey);

    if (!value) {
      return null;
    }

    const persisted = JSON.parse(value) as unknown;

    if (!isPersistedSnapshot(persisted)) {
      removeAnalysisStorageItem(storage, storageKey);
      return null;
    }

    return normalizePersistedAnalysisPageSnapshot(persisted.snapshot);
  } catch {
    removeAnalysisStorageItem(storage, storageKey);
    return null;
  }
}

export function readPersistedAnalysisModel(
  getStorage: () => AnalysisStateStorage | null,
  modelStorageKey: string,
): AnalysisModelId | null {
  const storage = readAnalysisStorage(getStorage);

  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(modelStorageKey);
    return isAnalysisModelId(value) ? value : null;
  } catch {
    return null;
  }
}

export function persistSelectedAnalysisModel(
  selectedAnalysisModel: AnalysisModelId,
  getStorage: () => AnalysisStateStorage | null,
  modelStorageKey: string,
) {
  const storage = readAnalysisStorage(getStorage);

  if (!storage) {
    return;
  }

  try {
    storage.setItem(modelStorageKey, selectedAnalysisModel);
  } catch {
    removeAnalysisStorageItem(storage, modelStorageKey);
  }
}

export function readAnalysisStorage(
  getStorage: () => AnalysisStateStorage | null,
): AnalysisStateStorage | null {
  try {
    return getStorage();
  } catch {
    return null;
  }
}

export function removeAnalysisStorageItem(
  storage: AnalysisStateStorage | null,
  key: string,
) {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Storage failures do not invalidate the in-memory state.
  }
}

function isPersistedSnapshot(value: unknown): value is {
  snapshot: Parameters<typeof normalizePersistedAnalysisPageSnapshot>[0];
  version: typeof STORAGE_VERSION;
} {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    isPersistedAnalysisPageSnapshot(value.snapshot)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
