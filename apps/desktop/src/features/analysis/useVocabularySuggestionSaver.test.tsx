/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularySuggestion } from "@nado/shared/analysis-presentation";
import { createAnalysisStateStore } from "./analysisState";

const mocks = vi.hoisted(() => ({
  currentUserId: "user-a" as string | null,
  getCurrentAccessToken: vi.fn(),
  saveVocabularyItem: vi.fn(),
  upsertItem: vi.fn(),
}));

vi.mock("../../auth/authClient", () => ({
  getCurrentAccessToken: mocks.getCurrentAccessToken,
}));

vi.mock("../../auth/authState", () => ({
  getAuthStateSnapshot: () => ({
    accessToken: mocks.currentUserId ? `token-${mocks.currentUserId}` : null,
    session: mocks.currentUserId ? { user: { id: mocks.currentUserId } } : null,
    status: mocks.currentUserId ? "authenticated" : "anonymous",
  }),
}));

vi.mock("../../api/vocabularyApi", () => ({
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
  mocks.currentUserId = "user-a";
  mocks.getCurrentAccessToken.mockReset();
  mocks.saveVocabularyItem.mockReset();
  mocks.upsertItem.mockReset();
});

describe("desktop useVocabularySuggestionSaver", () => {
  it("releases the pending key when an unexpected save error is thrown", async () => {
    mocks.getCurrentAccessToken.mockResolvedValue("token-user-a");
    mocks.saveVocabularyItem.mockRejectedValue(new Error("network failed"));
    const store = createAnalysisStateStore({ getStorage: () => null });
    store.syncUserScope("user-a");
    const { result } = renderHook(() =>
      useVocabularySuggestionSaver({
        store,
        userId: "user-a",
        vocabularySaveStates: store.getSnapshot().vocabularySaveStates,
        vocabularyState: {
          accessToken: "token-user-a",
          items: [],
          message: null,
          status: "ready",
        },
      }),
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

  it("shows the login notice without starting a save for an anonymous user", async () => {
    mocks.currentUserId = null;
    const store = createAnalysisStateStore({ getStorage: () => null });
    const { result } = renderHook(() =>
      useVocabularySuggestionSaver({
        store,
        userId: null,
        vocabularySaveStates: {},
        vocabularyState: {
          accessToken: null,
          items: [],
          message: null,
          status: "idle",
        },
      }),
    );

    await act(async () => {
      await result.current.saveSuggestion(suggestion);
    });

    expect(mocks.getCurrentAccessToken).not.toHaveBeenCalled();
    expect(mocks.saveVocabularyItem).not.toHaveBeenCalled();
    expect(store.getSnapshot().vocabularySaveMessage).toEqual({
      text: "로그인이 필요해요. Google 로그인 후 단어장에 저장할 수 있어요.",
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
    const { result } = renderHook(() =>
      useVocabularySuggestionSaver({
        store,
        userId: "user-a",
        vocabularySaveStates: store.getSnapshot().vocabularySaveStates,
        vocabularyState: {
          accessToken: "token-user-a",
          items: [],
          message: null,
          status: "ready",
        },
      }),
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
      accessToken.resolve("token-user-a");
      await Promise.all([firstRequest, duplicateRequest]);
    });

    expect(mocks.saveVocabularyItem).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().vocabularySaveStates).toEqual({});
  });

  it("ignores the previous account response while allowing the new account to save", async () => {
    const oldAccessToken = createDeferred<string | null>();
    mocks.getCurrentAccessToken
      .mockReturnValueOnce(oldAccessToken.promise)
      .mockResolvedValueOnce("token-user-b");
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
      { initialProps: { userId: "user-a" } },
    );

    let oldRequest!: Promise<void>;
    act(() => {
      oldRequest = result.current.saveSuggestion(suggestion);
    });

    mocks.currentUserId = "user-b";
    store.syncUserScope("user-b");
    rerender({ userId: "user-b" });

    let newRequest!: Promise<void>;
    act(() => {
      newRequest = result.current.saveSuggestion(suggestion);
    });

    await act(async () => {
      oldAccessToken.resolve("token-user-a");
      await Promise.all([oldRequest, newRequest]);
    });

    expect(mocks.saveVocabularyItem).toHaveBeenCalledTimes(1);
    expect(mocks.saveVocabularyItem).toHaveBeenCalledWith(
      expect.objectContaining({ term: "wondering" }),
      "token-user-b",
    );
    expect(store.getSnapshot().ownerUserId).toBe("user-b");
    expect(store.getSnapshot().vocabularySaveStates).toEqual({});
  });
});
