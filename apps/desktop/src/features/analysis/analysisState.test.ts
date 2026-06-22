import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ANALYSIS_MODEL_ID } from "@nado/shared";
import { createAnalysisStateStore } from "./analysisState";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe("createAnalysisStateStore", () => {
  it("starts with idle analysis state and empty input", () => {
    const store = createAnalysisStateStore({ getStorage: () => null });

    expect(store.getSnapshot()).toEqual({
      analysisState: { status: "idle" },
      selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
      text: "",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
  });

  it("updates text and notifies subscribers", () => {
    const store = createAnalysisStateStore({ getStorage: () => null });
    const listener = vi.fn();

    store.subscribe(listener);
    store.setText("I was wondering if you could help me.");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().text).toBe(
      "I was wondering if you could help me.",
    );
  });

  it("updates analysis state and vocabulary save state", () => {
    const store = createAnalysisStateStore({ getStorage: () => null });

    store.setAnalysisState({
      message: "분석 중 문제가 발생했어요.",
      status: "error",
    });
    store.setVocabularySaveMessage({
      text: "단어 저장은 로그인 기능 연결 후 사용할 수 있어요.",
      tone: "error",
    });
    store.setVocabularySaveStates({ "word:wonder:궁금해하다": "saving" });

    expect(store.getSnapshot()).toMatchObject({
      analysisState: {
        message: "분석 중 문제가 발생했어요.",
        status: "error",
      },
      vocabularySaveMessage: {
        text: "단어 저장은 로그인 기능 연결 후 사용할 수 있어요.",
        tone: "error",
      },
      vocabularySaveStates: {
        "word:wonder:궁금해하다": "saving",
      },
    });
  });

  it("restores a persisted snapshot when subscribed", () => {
    const storage = createMemoryStorage();
    const firstStore = createAnalysisStateStore({ getStorage: () => storage });
    firstStore.setText("Could you take a look?");

    const secondStore = createAnalysisStateStore({ getStorage: () => storage });
    secondStore.subscribe(() => undefined);

    expect(secondStore.getSnapshot().text).toBe("Could you take a look?");
  });

  it("resets state and removes persisted data", () => {
    const storage = createMemoryStorage();
    const store = createAnalysisStateStore({ getStorage: () => storage });

    store.setText("Could you take a look?");
    store.reset();

    expect(store.getSnapshot()).toEqual({
      analysisState: { status: "idle" },
      selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
      text: "",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
    expect(storage.removeItem).toHaveBeenCalledWith("nado.desktop.analysis.v1");
  });

  it("persists the selected analysis model separately from the analysis snapshot", () => {
    const snapshotStorage = createMemoryStorage();
    const modelStorage = createMemoryStorage();
    const store = createAnalysisStateStore({
      getModelStorage: () => modelStorage,
      getStorage: () => snapshotStorage,
    });

    store.setSelectedAnalysisModel("z-ai/glm-5.2");

    expect(store.getSnapshot().selectedAnalysisModel).toBe("z-ai/glm-5.2");
    expect(modelStorage.setItem).toHaveBeenCalledWith(
      "nado.desktop.analysis-model.v1",
      "z-ai/glm-5.2",
    );
  });
});
