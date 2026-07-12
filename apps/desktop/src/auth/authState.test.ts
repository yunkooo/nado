import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createAuthStateStore } from "./authState";

const staleSession = {
  access_token: "stale-token",
  expires_at: 1_800,
  refresh_token: "refresh-token",
  user: {
    email: "user@example.com",
  },
} as Session;

const refreshedSession = {
  ...staleSession,
  access_token: "fresh-token",
  expires_at: 3_600,
} as Session;

const activeSession = {
  ...staleSession,
  access_token: "active-token",
  expires_at: 3_600,
} as Session;

describe("desktop auth state store", () => {
  it("waits for a refreshed startup session before authenticating restored users", async () => {
    const unsubscribe = vi.fn();
    const refreshSession = vi.fn(async () => ({
      data: {
        session: refreshedSession,
      },
      error: null,
    }));
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => ({
            data: {
              session: staleSession,
            },
          }),
          refreshSession,
          onAuthStateChange: (handler) => {
            handler("INITIAL_SESSION", staleSession);

            return {
              data: {
                subscription: {
                  unsubscribe,
                },
              },
            };
          },
        },
      }),
      now: () => 1_550_000,
    });
    const snapshots: string[] = [];

    const stop = store.subscribe(() => {
      const snapshot = store.getSnapshot();
      snapshots.push(`${snapshot.status}:${snapshot.accessToken ?? "none"}`);
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      status: "loading",
    });

    await flushPromises();

    expect(refreshSession).toHaveBeenCalledWith(staleSession);
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "fresh-token",
      status: "authenticated",
    });
    expect(snapshots).not.toContain("authenticated:stale-token");

    stop();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("uses a restored desktop session without refreshing when it is still valid", async () => {
    const refreshSession = vi.fn(async () => ({
      data: {
        session: refreshedSession,
      },
      error: null,
    }));
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => ({
            data: {
              session: activeSession,
            },
          }),
          refreshSession,
          onAuthStateChange: () => ({
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          }),
        },
      }),
      now: () => 1_000_000,
    });

    store.subscribe(() => undefined);
    await flushPromises();

    expect(refreshSession).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "active-token",
      status: "authenticated",
    });
  });

  it("falls back to anonymous when a restored desktop session cannot refresh", async () => {
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => ({
            data: {
              session: staleSession,
            },
          }),
          refreshSession: vi.fn(async () => ({
            data: {
              session: null,
            },
            error: new Error("Invalid Refresh Token"),
          })),
          onAuthStateChange: () => ({
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          }),
        },
      }),
    });

    store.subscribe(() => undefined);
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      session: null,
      status: "anonymous",
    });
  });

  it("keeps a newer auth event when the startup session resolves later", async () => {
    const startupSession = createDeferred<{
      data: { session: Session | null };
    }>();
    let handleAuthStateChange:
      | ((event: string, session: Session | null) => void)
      | undefined;
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: () => startupSession.promise,
          refreshSession: vi.fn(),
          onAuthStateChange: (handler) => {
            handleAuthStateChange = handler;
            return {
              data: {
                subscription: {
                  unsubscribe: vi.fn(),
                },
              },
            };
          },
        },
      }),
      now: () => 1_000_000,
    });

    store.subscribe(() => undefined);
    handleAuthStateChange?.("SIGNED_IN", refreshedSession);
    startupSession.resolve({ data: { session: activeSession } });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "fresh-token",
      status: "authenticated",
    });
  });

  it("ignores an earlier startup request after the store resubscribes", async () => {
    const firstStartupSession = createDeferred<{
      data: { session: Session | null };
    }>();
    const getSession = vi
      .fn()
      .mockReturnValueOnce(firstStartupSession.promise)
      .mockResolvedValueOnce({ data: { session: refreshedSession } });
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession,
          refreshSession: vi.fn(),
          onAuthStateChange: () => ({
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          }),
        },
      }),
      now: () => 1_000_000,
    });

    const stopFirstSubscription = store.subscribe(() => undefined);
    stopFirstSubscription();
    store.subscribe(() => undefined);
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "fresh-token",
      status: "authenticated",
    });

    firstStartupSession.resolve({ data: { session: activeSession } });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "fresh-token",
      status: "authenticated",
    });
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
