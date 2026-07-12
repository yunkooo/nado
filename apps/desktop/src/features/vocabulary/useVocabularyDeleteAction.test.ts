/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  isCurrentVocabularyDeleteRequest,
  shouldApplyVocabularyMutation,
  shouldRemoveVocabularyItemAfterDelete,
  useVocabularyDeleteAction,
} from "./useVocabularyDeleteAction";

const mocks = vi.hoisted(() => ({
  deleteVocabularyItem: vi.fn(),
}));

vi.mock("../../api/vocabularyApi", async (importOriginal) => ({
  ...(await importOriginal()),
  deleteVocabularyItem: mocks.deleteVocabularyItem,
}));

const authState = {
  accessToken: "session-token",
  session: null,
  status: "authenticated",
} as AuthStateSnapshot;

describe("desktop vocabulary delete action", () => {
  beforeEach(() => {
    mocks.deleteVocabularyItem.mockReset();
  });

  it("applies a mutation only while the triggering access token is still current", () => {
    expect(shouldApplyVocabularyMutation("token-a", "token-a")).toBe(true);
    expect(shouldApplyVocabularyMutation("token-a", "token-b")).toBe(false);
    expect(shouldApplyVocabularyMutation("token-a", null)).toBe(false);
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

  it("tracks concurrent item deletions without an earlier response releasing a later one", async () => {
    const firstDelete = createDeferred<{ status: "success" }>();
    const secondDelete = createDeferred<{ status: "success" }>();
    mocks.deleteVocabularyItem.mockImplementation((itemId: string) =>
      itemId === "item-1" ? firstDelete.promise : secondDelete.promise,
    );
    const { result } = renderHook(() => useVocabularyDeleteAction(authState));
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
      firstDelete.resolve({ status: "success" });
      await firstRequest;
    });

    expect(result.current.deletingItemIds).toEqual(new Set(["item-2"]));

    await act(async () => {
      secondDelete.resolve({ status: "success" });
      await secondRequest;
    });

    expect(result.current.deletingItemIds).toEqual(new Set());
  });

  it("does not restore stale delete state after leaving and returning to the same token", async () => {
    const pendingDelete = createDeferred<{ status: "success" }>();
    mocks.deleteVocabularyItem
      .mockResolvedValueOnce({
        message: "단어장 항목을 삭제하지 못했어요.",
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
      await result.current.deleteItem("failed-item");
    });
    expect(result.current.deleteMessage).toBe(
      "단어장 항목을 삭제하지 못했어요.",
    );

    let pendingRequest!: Promise<void>;
    act(() => {
      pendingRequest = result.current.deleteItem("pending-item");
    });
    expect(result.current.deletingItemIds).toEqual(new Set(["pending-item"]));

    rerender({ state: anonymousState });
    rerender({ state: authState });

    expect(result.current.deleteMessage).toBeNull();
    expect(result.current.deletingItemIds).toEqual(new Set());

    await act(async () => {
      pendingDelete.resolve({ status: "success" });
      await pendingRequest;
    });

    expect(result.current.deleteMessage).toBeNull();
    expect(result.current.deletingItemIds).toEqual(new Set());
  });

  it("compares the full item request identity before applying a response", () => {
    const request = {
      accessToken: "token-a",
      itemId: "item-1",
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
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
