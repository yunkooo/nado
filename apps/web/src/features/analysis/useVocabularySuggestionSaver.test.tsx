/** @vitest-environment jsdom */

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularySuggestion } from "@nado/shared/analysis-presentation";
import { createAnalysisStateStore } from "./analysisState";
import { renderHook } from "../../test-utils/renderHook";

const mocks = vi.hoisted(() => ({
  getCurrentAccessToken: vi.fn(),
  saveVocabularyItem: vi.fn(),
  upsertItem: vi.fn(),
}));

vi.mock("../auth/authClient", () => ({
  getCurrentAccessToken: mocks.getCurrentAccessToken,
}));

vi.mock("../vocabulary/vocabularyApi", () => ({
  saveVocabularyItem: mocks.saveVocabularyItem,
}));

vi.mock("../vocabulary/vocabularyState", () => ({
  isVocabularySuggestionSaved: () => false,
  vocabularyStateStore: {
    upsertItem: mocks.upsertItem,
  },
}));

import { useVocabularySuggestionSaver } from "./useVocabularySuggestionSaver";

const suggestion: VocabularySuggestion = {
  meaning: "궁금해하다",
  term: "wondering",
  type: "word",
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

beforeEach(() => {
  mocks.getCurrentAccessToken.mockReset();
  mocks.saveVocabularyItem.mockReset();
  mocks.upsertItem.mockReset();
});

describe("useVocabularySuggestionSaver", () => {
  it("releases the pending key when an unexpected save error is thrown", async () => {
    mocks.getCurrentAccessToken.mockResolvedValue("token-a");
    mocks.saveVocabularyItem.mockRejectedValue(new Error("network failed"));
    const store = createAnalysisStateStore({ getStorage: () => null });
    store.syncUserScope("user-a");
    const { result } = renderHook(
      () =>
        useVocabularySuggestionSaver({
          store,
          userId: "user-a",
          vocabularySaveStates: store.getSnapshot().vocabularySaveStates,
          vocabularyState: {
            accessToken: "token-a",
            items: [],
            message: null,
            status: "ready",
          },
        }),
      undefined,
    );

    await act(async () => {
      await result.current.saveSuggestion(suggestion);
    });

    expect(store.getSnapshot().vocabularySaveStates).toEqual({});
    expect(store.getSnapshot().vocabularySaveMessage).toEqual({
      text: "단어장에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      tone: "error",
    });
  });

  it("claims a suggestion before awaiting the access token", async () => {
    const accessToken = createDeferred<string | null>();
    mocks.getCurrentAccessToken.mockReturnValue(accessToken.promise);
    mocks.saveVocabularyItem.mockResolvedValue({
      message: "저장하지 못했어요.",
      status: "error",
    });
    const store = createAnalysisStateStore({ getStorage: () => null });
    store.syncUserScope("user-a");
    const { result } = renderHook(
      () =>
        useVocabularySuggestionSaver({
          store,
          userId: "user-a",
          vocabularySaveStates: store.getSnapshot().vocabularySaveStates,
          vocabularyState: {
            accessToken: "token-a",
            items: [],
            message: null,
            status: "ready",
          },
        }),
      undefined,
    );

    let firstRequest!: Promise<void>;
    let duplicateRequest!: Promise<void>;
    act(() => {
      firstRequest = result.current.saveSuggestion(suggestion);
      duplicateRequest = result.current.saveSuggestion(suggestion);
    });

    expect(mocks.getCurrentAccessToken).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().vocabularySaveStates).toEqual({
      '["word","wondering","궁금해하다",""]': "saving",
    });

    await act(async () => {
      accessToken.resolve("token-a");
      await Promise.all([firstRequest, duplicateRequest]);
    });

    expect(mocks.saveVocabularyItem).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().vocabularySaveStates).toEqual({});
  });

  it("does not apply the old request after the user changes and releases the new scope", async () => {
    const oldAccessToken = createDeferred<string | null>();
    mocks.getCurrentAccessToken
      .mockReturnValueOnce(oldAccessToken.promise)
      .mockResolvedValueOnce("token-b");
    mocks.saveVocabularyItem.mockResolvedValue({
      message: "저장하지 못했어요.",
      status: "error",
    });
    const store = createAnalysisStateStore({ getStorage: () => null });
    store.syncUserScope("user-a");
    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) =>
        useVocabularySuggestionSaver({
          store,
          userId,
          vocabularySaveStates: store.getSnapshot().vocabularySaveStates,
          vocabularyState: {
            accessToken: `token-${userId}`,
            items: [],
            message: null,
            status: "ready",
          },
        }),
      { userId: "user-a" },
    );

    let oldRequest!: Promise<void>;
    act(() => {
      oldRequest = result.current.saveSuggestion(suggestion);
    });
    store.syncUserScope("user-b");
    rerender({ userId: "user-b" });

    let newRequest!: Promise<void>;
    act(() => {
      newRequest = result.current.saveSuggestion(suggestion);
    });
    await act(async () => {
      oldAccessToken.resolve("token-a");
      await Promise.all([oldRequest, newRequest]);
    });

    expect(mocks.saveVocabularyItem).toHaveBeenCalledTimes(1);
    expect(mocks.saveVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({ term: "wondering" }),
      "token-b",
    );
    expect(store.getSnapshot().ownerUserId).toBe("user-b");
    expect(store.getSnapshot().vocabularySaveStates).toEqual({});
  });
});
