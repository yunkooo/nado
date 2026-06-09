import { describe, expect, it, vi } from "vitest";
import {
  createAnalysisStateStore,
  type AnalysisPageSnapshot,
} from "./analysisState";

function createStorage(initialEntries: Record<string, string> = {}) {
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

function createSuccessSnapshot(): AnalysisPageSnapshot {
  return {
    analysisState: {
      data: {
        sentences: [],
        sourceText: "I leave home.",
        translation: ["나는 집을 나선다."],
        translationNotes: [],
        vocabularyItems: [],
        vocabularySuggestions: [],
      },
      status: "success",
    },
    text: "I leave home.",
    vocabularySaveMessage: null,
    vocabularySaveStates: {},
  };
}

describe("analysis state store", () => {
  it("notifies subscribers when the analysis snapshot changes", () => {
    const storage = createStorage();
    const store = createAnalysisStateStore({
      getStorage: () => storage,
    });
    const snapshots: string[] = [];

    const unsubscribe = store.subscribe(() => {
      const snapshot = store.getSnapshot();
      snapshots.push(`${snapshot.analysisState.status}:${snapshot.text}`);
    });

    store.setText("I leave home.");
    store.setAnalysisState(createSuccessSnapshot().analysisState);

    expect(snapshots).toEqual(["idle:I leave home.", "success:I leave home."]);
    expect(storage.setItem).toHaveBeenCalled();

    unsubscribe();
  });

  it("restores a persisted same-tab analysis snapshot", () => {
    const persisted = {
      snapshot: createSuccessSnapshot(),
      version: 1,
    };
    const storage = createStorage({
      "nado.analysis-state.v1": JSON.stringify(persisted),
    });
    const store = createAnalysisStateStore({
      getStorage: () => storage,
    });
    const unsubscribe = store.subscribe(() => {});

    expect(store.getSnapshot()).toMatchObject({
      analysisState: {
        status: "success",
      },
      text: "I leave home.",
    });

    unsubscribe();
  });

  it("drops persisted success snapshots with malformed analysis result data", () => {
    const storage = createStorage({
      "nado.analysis-state.v1": JSON.stringify({
        snapshot: {
          ...createSuccessSnapshot(),
          analysisState: {
            data: {
              sourceText: "I leave home.",
              translation: "나는 집을 나선다.",
            },
            status: "success",
          },
          vocabularySaveStates: {
            "after::~한 후에": "saved",
          },
        },
        version: 1,
      }),
    });
    const store = createAnalysisStateStore({
      getStorage: () => storage,
    });

    const unsubscribe = store.subscribe(() => {});

    expect(store.getSnapshot()).toEqual({
      analysisState: {
        status: "idle",
      },
      text: "",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
    expect(storage.removeItem).toHaveBeenCalledWith("nado.analysis-state.v1");

    unsubscribe();
  });

  it("starts from the server-safe initial snapshot before restoring persisted state", () => {
    const persisted = {
      snapshot: createSuccessSnapshot(),
      version: 1,
    };
    const storage = createStorage({
      "nado.analysis-state.v1": JSON.stringify(persisted),
    });
    const store = createAnalysisStateStore({
      getStorage: () => storage,
    });

    expect(store.getSnapshot()).toEqual({
      analysisState: {
        status: "idle",
      },
      text: "",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
  });

  it("resets to the initial analysis snapshot", () => {
    const storage = createStorage();
    const store = createAnalysisStateStore({
      getStorage: () => storage,
    });

    store.setAnalysisState(createSuccessSnapshot().analysisState);
    store.reset();

    expect(store.getSnapshot()).toEqual({
      analysisState: {
        status: "idle",
      },
      text: "",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
    expect(storage.removeItem).toHaveBeenCalledWith("nado.analysis-state.v1");
  });
});
