import { describe, expect, it, vi } from "vitest";
import { createMobileVocabularyLoadCoordinator } from "./mobileVocabularyLoadCoordinator";

describe("mobile vocabulary load coordinator", () => {
  it("runs one forced refresh after the active load settles", async () => {
    const initialLoad = createDeferred<void>();
    const queuedRefresh = createDeferred<void>();
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

    initialLoad.resolve(undefined);
    await flushPromises();

    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenNthCalledWith(2, { isQueuedRefresh: true });

    queuedRefresh.resolve(undefined);
    await activePromise;
  });

  it("coalesces repeated realtime events into one queued refresh", async () => {
    const initialLoad = createDeferred<void>();
    const operation = vi.fn(async (): Promise<void> => undefined);
    operation.mockImplementationOnce(() => initialLoad.promise);
    const coordinator = createMobileVocabularyLoadCoordinator();

    const activePromise = coordinator.run("access-token", {}, operation);
    coordinator.run("access-token", { force: true }, operation);
    coordinator.run("access-token", { force: true }, operation);

    initialLoad.resolve(undefined);
    await activePromise;

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("drops a queued refresh when the session is cancelled", async () => {
    const initialLoad = createDeferred<void>();
    const operation = vi.fn(() => initialLoad.promise);
    const coordinator = createMobileVocabularyLoadCoordinator();

    const activePromise = coordinator.run("access-token", {}, operation);
    coordinator.run("access-token", { force: true }, operation);
    coordinator.cancel();
    initialLoad.resolve(undefined);
    await activePromise;

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
