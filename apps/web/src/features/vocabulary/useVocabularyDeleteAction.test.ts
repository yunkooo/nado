/** @vitest-environment jsdom */

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../auth/authState";
import { renderHook } from "../../test-utils/renderHook";

const mocks = vi.hoisted(() => ({
  deleteVocabularyItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("./vocabularyApi", async (importOriginal) => {
  const original = await importOriginal<typeof import("./vocabularyApi")>();

  return {
    ...original,
    deleteVocabularyItem: mocks.deleteVocabularyItem,
  };
});

vi.mock("./vocabularyState", () => ({
  vocabularyStateStore: {
    removeItem: mocks.removeItem,
  },
}));

import {
  isCurrentVocabularyDeleteRequest,
  shouldRemoveVocabularyItemAfterDelete,
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
  mocks.deleteVocabularyItem.mockReset();
  mocks.removeItem.mockReset();
});

describe("isCurrentVocabularyDeleteRequest", () => {
  it("accepts only the latest delete request for the same access token", () => {
    expect(
      isCurrentVocabularyDeleteRequest(
        {
          accessToken: "session-token",
          itemId: "item-1",
          requestId: 2,
        },
        {
          accessToken: "session-token",
          itemId: "item-1",
          requestId: 2,
        },
      ),
    ).toBe(true);

    expect(
      isCurrentVocabularyDeleteRequest(
        {
          accessToken: "old-token",
          itemId: "item-1",
          requestId: 1,
        },
        {
          accessToken: "new-token",
          itemId: "item-1",
          requestId: 2,
        },
      ),
    ).toBe(false);
  });

  it("removes local stale items when the server says they are already gone", () => {
    expect(shouldRemoveVocabularyItemAfterDelete({ status: "success" })).toBe(
      true,
    );
    expect(
      shouldRemoveVocabularyItemAfterDelete({
        message: "단어장 항목을 찾을 수 없습니다.",
        status: "not-found",
      }),
    ).toBe(true);
    expect(
      shouldRemoveVocabularyItemAfterDelete({
        message: "단어장 항목을 삭제하지 못했어요.",
        status: "error",
      }),
    ).toBe(false);
  });
});

describe("useVocabularyDeleteAction", () => {
  it("applies every completed deletion when different items are deleted concurrently", async () => {
    const firstDelete = createDeferred<{ status: "success" }>();
    const secondDelete = createDeferred<{ status: "success" }>();
    mocks.deleteVocabularyItem.mockImplementation((itemId: string) =>
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
      firstRequest = result.current.deleteItem("item-1");
      secondRequest = result.current.deleteItem("item-2");
    });

    expect(result.current.deletingItemIds).toEqual(
      new Set(["item-1", "item-2"]),
    );

    await act(async () => {
      secondDelete.resolve({ status: "success" });
      await secondRequest;
    });
    await act(async () => {
      firstDelete.resolve({ status: "success" });
      await firstRequest;
    });

    expect(mocks.removeItem).toHaveBeenCalledTimes(2);
    expect(mocks.removeItem).toHaveBeenCalledWith("item-1");
    expect(mocks.removeItem).toHaveBeenCalledWith("item-2");
    expect(result.current.deletingItemIds.size).toBe(0);
  });

  it("ignores a deletion response after the authenticated account changes", async () => {
    const pendingDelete = createDeferred<{ status: "success" }>();
    mocks.deleteVocabularyItem.mockReturnValueOnce(pendingDelete.promise);
    const { result, rerender } = renderHook(
      ({ authState }: { authState: AuthStateSnapshot }) =>
        useVocabularyDeleteAction(authState),
      {
        authState: createAuthenticatedState("token-a", "user-a"),
      },
    );

    let request!: Promise<void>;
    act(() => {
      request = result.current.deleteItem("item-1");
    });
    rerender({ authState: createAuthenticatedState("token-b", "user-b") });

    await act(async () => {
      pendingDelete.resolve({ status: "success" });
      await request;
    });

    expect(mocks.removeItem).not.toHaveBeenCalled();
    expect(result.current.deletingItemIds.size).toBe(0);
  });
});
