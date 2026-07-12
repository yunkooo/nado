/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesktopAuthDeepLink } from "./desktopAuthDeepLink";

const mocks = vi.hoisted(() => ({
  completeAuthFromCallbackUrl: vi.fn(),
  getCurrent: vi.fn(),
  invoke: vi.fn(),
  listen: vi.fn(),
  onOpenUrl: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mocks.listen,
}));

vi.mock("@tauri-apps/plugin-deep-link", () => ({
  getCurrent: mocks.getCurrent,
  onOpenUrl: mocks.onOpenUrl,
}));

vi.mock("./authClient", () => ({
  completeAuthFromCallbackUrl: mocks.completeAuthFromCallbackUrl,
  isTauriRuntime: () => true,
}));

describe("useDesktopAuthDeepLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrent.mockResolvedValue(null);
    mocks.invoke.mockResolvedValue(null);
    mocks.listen.mockResolvedValue(vi.fn());
    mocks.onOpenUrl.mockResolvedValue(vi.fn());
  });

  it("recovers a loopback startup error emitted before listeners were ready", async () => {
    mocks.invoke.mockResolvedValue("address already in use");

    const { result } = renderHook(() => useDesktopAuthDeepLink());

    await waitFor(() => {
      expect(result.current).toEqual({
        message:
          "데스크탑 로그인 콜백 서버를 시작하지 못했어요. nado 앱을 모두 종료한 뒤 다시 열어 주세요.",
        status: "error",
      });
    });

    expect(mocks.invoke).toHaveBeenCalledWith("get_oauth_loopback_error");
  });

  it("unlistens when an asynchronous registration settles after unmount", async () => {
    const registration = createDeferred<() => void>();
    const unlisten = vi.fn();
    mocks.onOpenUrl.mockReturnValue(registration.promise);

    const { unmount } = renderHook(() => useDesktopAuthDeepLink());

    await waitFor(() => {
      expect(mocks.onOpenUrl).toHaveBeenCalledTimes(1);
    });
    unmount();
    registration.resolve(unlisten);

    await waitFor(() => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
