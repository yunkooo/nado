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
      ownerUserId: null,
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
    firstStore.syncUserScope("user-a");
    firstStore.setText("Could you take a look?");

    const secondStore = createAnalysisStateStore({ getStorage: () => storage });
    secondStore.subscribe(() => undefined);
    secondStore.syncUserScope("user-a");

    expect(secondStore.getSnapshot().text).toBe("Could you take a look?");
  });

  it("drops persisted analysis data when a different user scope starts", () => {
    const storage = createMemoryStorage();
    const firstStore = createAnalysisStateStore({ getStorage: () => storage });
    firstStore.syncUserScope("user-a");
    firstStore.setText("Could you take a look?");

    const secondStore = createAnalysisStateStore({ getStorage: () => storage });
    secondStore.subscribe(() => undefined);
    secondStore.syncUserScope("user-b");

    expect(secondStore.getSnapshot()).toMatchObject({
      analysisState: { status: "idle" },
      ownerUserId: "user-b",
      text: "",
    });
    expect(storage.removeItem).toHaveBeenCalledWith("nado.desktop.analysis.v1");
  });

  it("persists only recoverable analysis state", () => {
    const storage = createMemoryStorage();
    const store = createAnalysisStateStore({ getStorage: () => storage });

    store.setText("Could you take a look?");
    store.setAnalysisState({ status: "loading" });
    store.setVocabularySaveMessage({
      text: "단어장에 저장하고 있어요.",
      tone: "success",
    });
    store.setVocabularySaveStates({ "phrase:take a look:살펴보다": "saving" });

    const persisted = JSON.parse(
      storage.getItem("nado.desktop.analysis.v1") ?? "null",
    ) as { snapshot: ReturnType<typeof store.getSnapshot> };

    expect(store.getSnapshot()).toMatchObject({
      analysisState: { status: "loading" },
      vocabularySaveMessage: { text: "단어장에 저장하고 있어요." },
      vocabularySaveStates: { "phrase:take a look:살펴보다": "saving" },
    });
    expect(persisted.snapshot).toMatchObject({
      analysisState: { status: "idle" },
      text: "Could you take a look?",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
  });

  it("drops malformed persisted analysis results", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "nado.desktop.analysis.v1",
      JSON.stringify({
        snapshot: {
          analysisState: {
            data: {
              sourceText: "Could you take a look?",
              translation: "잘못됨",
            },
            status: "success",
          },
          ownerUserId: "user-a",
          selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
          text: "Could you take a look?",
          vocabularySaveMessage: null,
          vocabularySaveStates: {},
        },
        version: 2,
      }),
    );
    const store = createAnalysisStateStore({ getStorage: () => storage });

    store.subscribe(() => undefined);

    expect(store.getSnapshot()).toEqual({
      analysisState: { status: "idle" },
      ownerUserId: null,
      selectedAnalysisModel: DEFAULT_ANALYSIS_MODEL_ID,
      text: "",
      vocabularySaveMessage: null,
      vocabularySaveStates: {},
    });
    expect(storage.removeItem).toHaveBeenCalledWith("nado.desktop.analysis.v1");
  });

  it("resets state and removes persisted data", () => {
    const storage = createMemoryStorage();
    const store = createAnalysisStateStore({ getStorage: () => storage });

    store.setText("Could you take a look?");
    store.reset();

    expect(store.getSnapshot()).toEqual({
      analysisState: { status: "idle" },
      ownerUserId: null,
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

  it("keeps the selected analysis model in memory when persistence fails", () => {
    const modelStorage = createMemoryStorage();
    modelStorage.setItem.mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const store = createAnalysisStateStore({
      getModelStorage: () => modelStorage,
    });

    expect(() => store.setSelectedAnalysisModel("z-ai/glm-5.2")).not.toThrow();
    expect(store.getSnapshot().selectedAnalysisModel).toBe("z-ai/glm-5.2");
  });
});
