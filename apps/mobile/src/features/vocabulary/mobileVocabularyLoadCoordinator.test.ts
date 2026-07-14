import { describe, expect, it, vi } from "vitest";
import {
  createMobileVocabularyLoadCoordinator,
  type MobileVocabularyRefreshResult,
} from "./mobileVocabularyLoadCoordinator";

describe("mobile vocabulary load coordinator", () => {
  it("runs one forced refresh after the active load settles", async () => {
    const initialLoad = createDeferred<MobileVocabularyRefreshResult>();
    const queuedRefresh = createDeferred<MobileVocabularyRefreshResult>();
    const operation = vi
      .fn()
      .mockImplementationOnce(() => initialLoad.promise)
      .mockImplementationOnce(() => queuedRefresh.promise);
    const coordinator = createMobileVocabularyLoadCoordinator();

    const activePromise = coordinator.run("access-token", {}, operation);
    const forcedPromise = coordinator.run(
      "access-token",
      { force: true },
      operation,
    );

    expect(forcedPromise).toBe(activePromise);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenNthCalledWith(1, { isQueuedRefresh: false });

    initialLoad.resolve("refreshed");
    await flushPromises();

    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenNthCalledWith(2, { isQueuedRefresh: true });

    queuedRefresh.resolve("failed");
    await expect(activePromise).resolves.toBe("failed");
  });

  it("coalesces repeated realtime events into one queued refresh", async () => {
    const initialLoad = createDeferred<MobileVocabularyRefreshResult>();
    const operation = vi.fn(
      async (): Promise<MobileVocabularyRefreshResult> => "refreshed",
    );
    operation.mockImplementationOnce(() => initialLoad.promise);
    const coordinator = createMobileVocabularyLoadCoordinator();

    const activePromise = coordinator.run("access-token", {}, operation);
    coordinator.run("access-token", { force: true }, operation);
    coordinator.run("access-token", { force: true }, operation);

    initialLoad.resolve("refreshed");
    await activePromise;

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("drops a queued refresh when the session is cancelled", async () => {
    const initialLoad = createDeferred<MobileVocabularyRefreshResult>();
    const operation = vi.fn(() => initialLoad.promise);
    const coordinator = createMobileVocabularyLoadCoordinator();

    const activePromise = coordinator.run("access-token", {}, operation);
    coordinator.run("access-token", { force: true }, operation);
    coordinator.cancel();
    initialLoad.resolve("refreshed");
    await expect(activePromise).resolves.toBe("ignored");

    expect(operation).toHaveBeenCalledTimes(1);
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
