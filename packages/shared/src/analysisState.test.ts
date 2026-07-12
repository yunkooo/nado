import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ANALYSIS_MODEL_ID } from "./analysisInput";
import {
  createAnalysisStateStoreCore,
  isAnalysisPageSnapshot,
} from "./analysisState";

function createMemoryStorage(initialEntries: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initialEntries));

  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      entries.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
  };
}

describe("analysis state core", () => {
  it("persists only recoverable state and keeps model selection separate", () => {
    const stateStorage = createMemoryStorage();
    const modelStorage = createMemoryStorage();
    const store = createAnalysisStateStoreCore({
      getModelStorage: () => modelStorage,
      getStorage: () => stateStorage,
      modelStorageKey: "model",
      storageKey: "state",
    });

    store.setText("I leave home.");
    store.setAnalysisState({ status: "loading" });
    store.setVocabularySaveMessage({ text: "저장 중", tone: "success" });
    store.setVocabularySaveStates({ leave: "saving" });
    store.setSelectedAnalysisModel("z-ai/glm-5.2");

    const persisted = JSON.parse(stateStorage.getItem("state") ?? "null") as {
      snapshot: ReturnType<typeof store.getSnapshot>;
    };

    expect(persisted.snapshot).toMatchObject({
      analysisState: { status: "idle" },
      text: "I leave home.",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
    expect(modelStorage.getItem("model")).toBe("z-ai/glm-5.2");
  });

  it("invalidates request scopes when the owner changes", () => {
    const store = createAnalysisStateStoreCore({
      modelStorageKey: "model",
      storageKey: "state",
    });

    store.syncUserScope("user-a");
    const request = store.beginAnalysisRequest("user-a");

    expect(request).not.toBeNull();
    expect(store.isAnalysisRequestCurrent(request!)).toBe(true);

    store.syncUserScope("user-b");

    expect(store.isAnalysisRequestCurrent(request!)).toBe(false);
  });

  it("rejects error snapshots without a message", () => {
    expect(
      isAnalysisPageSnapshot({
        analysisState: { status: "error" },
        ownerUserId: null,
        selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
        text: "",
        vocabularySaveMessage: null,
        vocabularySaveStates: {},
      }),
    ).toBe(false);
  });

  it("keeps the in-memory store usable when storage access fails", () => {
    const store = createAnalysisStateStoreCore({
      getStorage: () => {
        throw new Error("blocked");
      },
      modelStorageKey: "model",
      storageKey: "state",
    });

    expect(() => store.setText("I stay home.")).not.toThrow();
    expect(store.getSnapshot().text).toBe("I stay home.");
  });
});
