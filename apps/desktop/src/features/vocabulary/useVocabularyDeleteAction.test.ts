/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import {
  createVocabularyMeaningMutationKey,
  type VocabularyItem,
} from "@nado/shared/vocabulary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  isCurrentVocabularyDeleteRequest,
  shouldApplyVocabularyMutation,
  useVocabularyDeleteAction,
} from "./useVocabularyDeleteAction";

const mocks = vi.hoisted(() => ({
  deleteVocabularyMeaning: vi.fn(),
  refreshVocabularyForAuth: vi.fn(),
  removeItem: vi.fn(),
  upsertItem: vi.fn(),
}));

vi.mock("../../api/vocabularyApi", async (importOriginal) => ({
  ...(await importOriginal()),
  deleteVocabularyMeaning: mocks.deleteVocabularyMeaning,
}));

vi.mock("./vocabularyState", () => ({
  refreshVocabularyForAuth: mocks.refreshVocabularyForAuth,
  vocabularyStateStore: {
    removeItem: mocks.removeItem,
    upsertItem: mocks.upsertItem,
  },
}));

const authState = {
  accessToken: "session-token",
  session: null,
  status: "authenticated",
} as AuthStateSnapshot;

const meaning = {
  createdAt: "2026-07-12T00:00:00.000Z",
  meaning: "상태",
};

const updatedItem: VocabularyItem = {
  createdAt: "2026-07-12T00:00:00.000Z",
  id: "item-2",
  meanings: [{ meaning: "지역 주" }],
  term: "state",
  type: "word",
  updatedAt: "2026-07-12T00:01:00.000Z",
};

describe("desktop vocabulary delete action", () => {
  beforeEach(() => {
    mocks.deleteVocabularyMeaning.mockReset();
    mocks.refreshVocabularyForAuth.mockReset();
    mocks.refreshVocabularyForAuth.mockResolvedValue("refreshed");
    mocks.removeItem.mockReset();
    mocks.upsertItem.mockReset();
  });

  it("applies a mutation only while the triggering access token is still current", () => {
    expect(shouldApplyVocabularyMutation("token-a", "token-a")).toBe(true);
    expect(shouldApplyVocabularyMutation("token-a", "token-b")).toBe(false);
    expect(shouldApplyVocabularyMutation("token-a", null)).toBe(false);
  });

  it("tracks concurrent item deletions without an earlier response releasing a later one", async () => {
    const firstDelete = createDeferred<{
      data: { item: null; itemDeleted: true };
      status: "success";
    }>();
    const secondDelete = createDeferred<{
      data: { item: VocabularyItem; itemDeleted: false };
      status: "success";
    }>();
    mocks.deleteVocabularyMeaning.mockImplementation((itemId: string) =>
      itemId === "item-1" ? firstDelete.promise : secondDelete.promise,
    );
    const { result } = renderHook(() => useVocabularyDeleteAction(authState));
    let firstRequest!: Promise<void>;
    let secondRequest!: Promise<void>;

    act(() => {
      firstRequest = result.current.deleteMeaning("item-1", meaning);
      secondRequest = result.current.deleteMeaning("item-2", meaning);
    });

    expect(result.current.deletingMeaningKeys).toEqual(
      new Set([
        createVocabularyMeaningMutationKey("item-1", meaning),
        createVocabularyMeaningMutationKey("item-2", meaning),
      ]),
    );

    await act(async () => {
      firstDelete.resolve({
        data: { item: null, itemDeleted: true },
        status: "success",
      });
      await firstRequest;
    });

    expect(result.current.deletingMeaningKeys).toEqual(
      new Set([createVocabularyMeaningMutationKey("item-2", meaning)]),
    );

    await act(async () => {
      secondDelete.resolve({
        data: { item: updatedItem, itemDeleted: false },
        status: "success",
      });
      await secondRequest;
    });

    expect(result.current.deletingMeaningKeys).toEqual(new Set());
    expect(mocks.removeItem).toHaveBeenCalledWith("item-1");
    expect(mocks.upsertItem).toHaveBeenCalledWith(updatedItem);
  });

  it("does not restore stale delete state after leaving and returning to the same token", async () => {
    const pendingDelete = createDeferred<{
      data: { item: null; itemDeleted: true };
      status: "success";
    }>();
    mocks.deleteVocabularyMeaning
      .mockResolvedValueOnce({
        message: "단어장 뜻을 삭제하지 못했어요.",
        status: "error",
      })
      .mockReturnValueOnce(pendingDelete.promise);
    const anonymousState = {
      accessToken: null,
      session: null,
      status: "anonymous",
    } as AuthStateSnapshot;
    const { result, rerender } = renderHook(
      ({ state }: { state: AuthStateSnapshot }) =>
        useVocabularyDeleteAction(state),
      { initialProps: { state: authState } },
    );

    await act(async () => {
      await result.current.deleteMeaning("failed-item", meaning);
    });
    expect(result.current.deleteMessage).toBe("단어장 뜻을 삭제하지 못했어요.");
    expect(mocks.removeItem).not.toHaveBeenCalled();

    let pendingRequest!: Promise<void>;
    act(() => {
      pendingRequest = result.current.deleteMeaning("pending-item", meaning);
    });
    expect(result.current.deletingMeaningKeys).toEqual(
      new Set([createVocabularyMeaningMutationKey("pending-item", meaning)]),
    );

    rerender({ state: anonymousState });
    rerender({ state: authState });

    expect(result.current.deleteMessage).toBeNull();
    expect(result.current.deletingMeaningKeys).toEqual(new Set());

    await act(async () => {
      pendingDelete.resolve({
        data: { item: null, itemDeleted: true },
        status: "success",
      });
      await pendingRequest;
    });

    expect(result.current.deleteMessage).toBeNull();
    expect(result.current.deletingMeaningKeys).toEqual(new Set());
  });

  it("compares the full item request identity before applying a response", () => {
    const request = {
      accessToken: "token-a",
      itemId: "item-1",
      meaningKey: "meaning-1",
      requestId: 1,
    };

    expect(isCurrentVocabularyDeleteRequest(request, request)).toBe(true);
    expect(
      isCurrentVocabularyDeleteRequest(request, {
        ...request,
        requestId: 2,
      }),
    ).toBe(false);
  });

  it("keeps a 404 deletion pending until the server snapshot refresh finishes", async () => {
    const pendingRefresh = createDeferred<string>();
    mocks.deleteVocabularyMeaning.mockResolvedValueOnce({
      message: "저장된 단어나 뜻을 찾지 못했어요.",
      status: "not-found",
    });
    mocks.refreshVocabularyForAuth.mockReturnValueOnce(pendingRefresh.promise);
    const { result } = renderHook(() => useVocabularyDeleteAction(authState));
    const meaningKey = createVocabularyMeaningMutationKey("item-1", meaning);
    let request!: Promise<void>;

    await act(async () => {
      request = result.current.deleteMeaning("item-1", meaning);
      await Promise.resolve();
    });

    expect(mocks.removeItem).not.toHaveBeenCalled();
    expect(mocks.refreshVocabularyForAuth).toHaveBeenCalledWith(authState, {
      force: true,
    });
    expect(result.current.deleteMessage).toBeNull();
    expect(result.current.deletingMeaningKeys).toEqual(new Set([meaningKey]));

    act(() => {
      void result.current.deleteMeaning("item-1", meaning);
    });
    expect(mocks.deleteVocabularyMeaning).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingRefresh.resolve("refreshed");
      await request;
    });

    expect(result.current.deletingMeaningKeys).toEqual(new Set());
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
