/** @vitest-environment jsdom */

import { act } from "react";
import {
  createVocabularyMeaningMutationKey,
  type VocabularyItem,
} from "@nado/shared/vocabulary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../auth/authState";
import { renderHook } from "../../test-utils/renderHook";

const mocks = vi.hoisted(() => ({
  deleteVocabularyMeaning: vi.fn(),
  refreshVocabularyForAuth: vi.fn(),
  removeItem: vi.fn(),
  upsertItem: vi.fn(),
}));

vi.mock("./vocabularyApi", async (importOriginal) => {
  const original = await importOriginal<typeof import("./vocabularyApi")>();

  return {
    ...original,
    deleteVocabularyMeaning: mocks.deleteVocabularyMeaning,
  };
});

vi.mock("./vocabularyState", () => ({
  refreshVocabularyForAuth: mocks.refreshVocabularyForAuth,
  vocabularyStateStore: {
    removeItem: mocks.removeItem,
    upsertItem: mocks.upsertItem,
  },
}));

import {
  isCurrentVocabularyDeleteRequest,
  useVocabularyDeleteAction,
} from "./useVocabularyDeleteAction";

function createAuthenticatedState(
  accessToken: string,
  userId: string,
): AuthStateSnapshot {
  return {
    accessToken,
    session: { user: { id: userId } } as AuthStateSnapshot["session"],
    status: "authenticated",
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

beforeEach(() => {
  mocks.deleteVocabularyMeaning.mockReset();
  mocks.refreshVocabularyForAuth.mockReset();
  mocks.refreshVocabularyForAuth.mockResolvedValue("refreshed");
  mocks.removeItem.mockReset();
  mocks.upsertItem.mockReset();
});

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

describe("isCurrentVocabularyDeleteRequest", () => {
  it("accepts only the latest delete request for the same access token", () => {
    expect(
      isCurrentVocabularyDeleteRequest(
        {
          accessToken: "session-token",
          itemId: "item-1",
          meaningKey: "meaning-1",
          requestId: 2,
        },
        {
          accessToken: "session-token",
          itemId: "item-1",
          meaningKey: "meaning-1",
          requestId: 2,
        },
      ),
    ).toBe(true);

    expect(
      isCurrentVocabularyDeleteRequest(
        {
          accessToken: "old-token",
          itemId: "item-1",
          meaningKey: "meaning-1",
          requestId: 1,
        },
        {
          accessToken: "new-token",
          itemId: "item-1",
          meaningKey: "meaning-1",
          requestId: 2,
        },
      ),
    ).toBe(false);
  });
});

describe("useVocabularyDeleteAction", () => {
  it("keeps one in-flight meaning deletion per vocabulary item", async () => {
    const pendingDelete = createDeferred<{
      data: { item: null; itemDeleted: true };
      status: "success";
    }>();
    mocks.deleteVocabularyMeaning.mockReturnValueOnce(pendingDelete.promise);
    const authState = createAuthenticatedState("session-token", "user-a");
    const { result } = renderHook(
      () => useVocabularyDeleteAction(authState),
      undefined,
    );

    let firstRequest!: Promise<void>;
    act(() => {
      firstRequest = result.current.deleteMeaning("item-1", meaning);
      void result.current.deleteMeaning("item-1", { meaning: "지역 주" });
    });

    expect(mocks.deleteVocabularyMeaning).toHaveBeenCalledTimes(1);
    expect(result.current.deletingMeaningKeys).toEqual(
      new Set([createVocabularyMeaningMutationKey("item-1", meaning)]),
    );

    await act(async () => {
      pendingDelete.resolve({
        data: { item: null, itemDeleted: true },
        status: "success",
      });
      await firstRequest;
    });
  });

  it("applies every completed deletion when different items are deleted concurrently", async () => {
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
    const authState = createAuthenticatedState("session-token", "user-a");
    const { result } = renderHook(
      () => useVocabularyDeleteAction(authState),
      undefined,
    );

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
      secondDelete.resolve({
        data: { item: updatedItem, itemDeleted: false },
        status: "success",
      });
      await secondRequest;
    });
    await act(async () => {
      firstDelete.resolve({
        data: { item: null, itemDeleted: true },
        status: "success",
      });
      await firstRequest;
    });

    expect(mocks.removeItem).toHaveBeenCalledTimes(1);
    expect(mocks.removeItem).toHaveBeenCalledWith("item-1");
    expect(mocks.upsertItem).toHaveBeenCalledWith(updatedItem);
    expect(result.current.deletingMeaningKeys.size).toBe(0);
  });

  it("ignores a deletion response after the authenticated account changes", async () => {
    const pendingDelete = createDeferred<{
      data: { item: null; itemDeleted: true };
      status: "success";
    }>();
    mocks.deleteVocabularyMeaning.mockReturnValueOnce(pendingDelete.promise);
    const { result, rerender } = renderHook(
      ({ authState }: { authState: AuthStateSnapshot }) =>
        useVocabularyDeleteAction(authState),
      {
        authState: createAuthenticatedState("token-a", "user-a"),
      },
    );

    let request!: Promise<void>;
    act(() => {
      request = result.current.deleteMeaning("item-1", meaning);
    });
    rerender({ authState: createAuthenticatedState("token-b", "user-b") });

    await act(async () => {
      pendingDelete.resolve({
        data: { item: null, itemDeleted: true },
        status: "success",
      });
      await request;
    });

    expect(mocks.removeItem).not.toHaveBeenCalled();
    expect(result.current.deletingMeaningKeys.size).toBe(0);
  });

  it("keeps a 404 deletion pending until the server snapshot refresh finishes", async () => {
    const pendingRefresh = createDeferred<string>();
    mocks.deleteVocabularyMeaning.mockResolvedValueOnce({
      message: "저장된 단어나 뜻을 찾지 못했어요.",
      status: "not-found",
    });
    mocks.refreshVocabularyForAuth.mockReturnValueOnce(pendingRefresh.promise);
    const authState = createAuthenticatedState("session-token", "user-a");
    const { result } = renderHook(
      () => useVocabularyDeleteAction(authState),
      undefined,
    );
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

    expect(result.current.deletingMeaningKeys.size).toBe(0);
  });

  it.each(["failed", "ignored"] as const)(
    "keeps a 404 deletion locked when the server snapshot refresh is %s",
    async (refreshResult) => {
      mocks.deleteVocabularyMeaning.mockResolvedValueOnce({
        message: "저장된 단어나 뜻을 찾지 못했어요.",
        status: "not-found",
      });
      mocks.refreshVocabularyForAuth.mockResolvedValueOnce(refreshResult);
      const authState = createAuthenticatedState("session-token", "user-a");
      const { result } = renderHook(
        () => useVocabularyDeleteAction(authState),
        undefined,
      );
      const meaningKey = createVocabularyMeaningMutationKey("item-1", meaning);

      await act(async () => {
        await result.current.deleteMeaning("item-1", meaning);
      });

      expect(result.current.deletingMeaningKeys).toEqual(new Set([meaningKey]));
      expect(result.current.deleteMessage).toBe(
        "단어장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      );

      act(() => {
        void result.current.deleteMeaning("item-1", meaning);
      });
      expect(mocks.deleteVocabularyMeaning).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps the card visible when the delete service fails", async () => {
    mocks.deleteVocabularyMeaning.mockResolvedValueOnce({
      message: "데이터 서비스를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
    const authState = createAuthenticatedState("session-token", "user-a");
    const { result } = renderHook(
      () => useVocabularyDeleteAction(authState),
      undefined,
    );

    await act(async () => {
      await result.current.deleteMeaning("item-1", meaning);
    });

    expect(mocks.removeItem).not.toHaveBeenCalled();
    expect(mocks.refreshVocabularyForAuth).not.toHaveBeenCalled();
    expect(result.current.deleteMessage).toBe(
      "데이터 서비스를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    );
  });
});
