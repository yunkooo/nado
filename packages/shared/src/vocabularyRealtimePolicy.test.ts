import { describe, expect, it, vi } from "vitest";
import {
  createVocabularyRealtimeRefreshScheduler,
  createVocabularyRealtimeTopic,
  isVocabularyRealtimeTopicForUser,
  shouldRefreshVocabularyFromLifecycle,
  shouldStartVocabularyManualRefresh,
} from "./vocabularyRealtime";

describe("vocabulary realtime helpers", () => {
  it("allows the first manual vocabulary refresh and throttles rapid repeats", () => {
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: false,
        lastStartedAt: undefined,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(true);
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: false,
        lastStartedAt: 9_000,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(false);
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: false,
        lastStartedAt: 8_000,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(true);
  });

  it("blocks manual vocabulary refreshes while another one is in flight", () => {
    expect(
      shouldStartVocabularyManualRefresh({
        isRefreshing: true,
        lastStartedAt: undefined,
        now: 10_000,
        throttleMs: 2_000,
      }),
    ).toBe(false);
  });

  it("refreshes lifecycle vocabulary only when the active snapshot is stale or not ready", () => {
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: false,
        lastLoadedAt: undefined,
        now: 120_000,
        status: "ready",
      }),
    ).toBe(false);
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: 90_000,
        now: 120_000,
        status: "ready",
      }),
    ).toBe(false);
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: 30_000,
        now: 120_000,
        status: "ready",
      }),
    ).toBe(true);
    expect(
      shouldRefreshVocabularyFromLifecycle({
        isStudySurfaceActive: true,
        lastLoadedAt: 90_000,
        now: 120_000,
        status: "error",
      }),
    ).toBe(true);
  });

  it("creates a user-scoped vocabulary realtime topic", () => {
    expect(createVocabularyRealtimeTopic(" user-id ")).toBe(
      "vocabulary:user-id",
    );
    expect(createVocabularyRealtimeTopic("")).toBeNull();
    expect(createVocabularyRealtimeTopic(null)).toBeNull();
  });

  it("matches realtime topics against the current user", () => {
    expect(
      isVocabularyRealtimeTopicForUser("vocabulary:user-id", "user-id"),
    ).toBe(true);
    expect(
      isVocabularyRealtimeTopicForUser("vocabulary:other-user", "user-id"),
    ).toBe(false);
    expect(isVocabularyRealtimeTopicForUser("profile:user-id", "user-id")).toBe(
      false,
    );
  });

  it("debounces repeated vocabulary realtime refresh requests", () => {
    const timers = createFakeTimers();
    const refresh = vi.fn();
    const scheduler = createVocabularyRealtimeRefreshScheduler({
      debounceMs: 50,
      refresh,
      timers,
    });

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();

    expect(timers.setTimeout).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();

    timers.runNext();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("schedules one more refresh when events arrive during an active refresh", async () => {
    const timers = createFakeTimers();
    let resolveRefresh: (() => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const scheduler = createVocabularyRealtimeRefreshScheduler({
      debounceMs: 50,
      refresh,
      timers,
    });

    scheduler.schedule();
    timers.runNext();

    scheduler.schedule();
    timers.runNext();

    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await Promise.resolve();

    expect(timers.pendingCount()).toBe(1);

    timers.runNext();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending vocabulary realtime refresh", () => {
    const timers = createFakeTimers();
    const refresh = vi.fn();
    const scheduler = createVocabularyRealtimeRefreshScheduler({
      debounceMs: 50,
      refresh,
      timers,
    });

    scheduler.schedule();
    scheduler.cancel();
    timers.runNext();

    expect(timers.clearTimeout).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});

function createFakeTimers() {
  let nextId = 1;
  const tasks = new Map<number, () => void>();

  return {
    clearTimeout: vi.fn((id: number) => {
      tasks.delete(id);
    }),
    pendingCount() {
      return tasks.size;
    },
    runNext() {
      const [id, callback] = tasks.entries().next().value ?? [];

      if (typeof id !== "number" || !callback) {
        return;
      }

      tasks.delete(id);
      callback();
    },
    setTimeout: vi.fn((callback: () => void) => {
      const id = nextId;
      nextId += 1;
      tasks.set(id, callback);

      return id;
    }),
  };
}
