import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createAuthStateStore } from "./authState";

const authenticatedSession = {
  access_token: "session-token",
  refresh_token: "refresh-token",
  user: {
    email: "user@example.com",
  },
} as Session;

describe("auth state store", () => {
  it("notifies subscribers when the Supabase session changes", async () => {
    let handleAuthStateChange: (
      event: string,
      session: Session | null,
    ) => void = () => undefined;
    const unsubscribe = vi.fn();
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => ({
            data: {
              session: authenticatedSession,
            },
          }),
          refreshSession: vi.fn(async () => ({
            data: {
              session: authenticatedSession,
            },
            error: null,
          })),
          setSession: vi.fn(),
          onAuthStateChange: (handler) => {
            handleAuthStateChange = handler;

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
    });
    const snapshots: string[] = [];

    const stop = store.subscribe(() => {
      const snapshot = store.getSnapshot();
      snapshots.push(`${snapshot.status}:${snapshot.accessToken ?? "none"}`);
    });

    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "authenticated",
    });

    handleAuthStateChange("SIGNED_OUT", null);

    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      session: null,
      status: "anonymous",
    });
    expect(snapshots).toContain("authenticated:session-token");
    expect(snapshots).toContain("anonymous:none");

    stop();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("uses the restored startup session without forcing an extra refresh", async () => {
    const refreshSession = vi.fn(async () => ({
      data: {
        session: {
          ...authenticatedSession,
          access_token: "fresh-token",
        },
      },
      error: null,
    }));
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => ({
            data: {
              session: authenticatedSession,
            },
          }),
          refreshSession,
          setSession: vi.fn(),
          onAuthStateChange: (handler) => {
            handler("INITIAL_SESSION", authenticatedSession);

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
    });
    const snapshots: string[] = [];

    store.subscribe(() => {
      const snapshot = store.getSnapshot();
      snapshots.push(`${snapshot.status}:${snapshot.accessToken ?? "none"}`);
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      status: "loading",
    });

    await flushPromises();

    expect(refreshSession).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "authenticated",
    });
    expect(snapshots).toContain("authenticated:session-token");
  });

  it("falls back to anonymous when no restored session is available", async () => {
    const refreshSession = vi.fn(async () => ({
      data: {
        session: authenticatedSession,
      },
      error: null,
    }));
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => ({
            data: {
              session: null,
            },
          }),
          refreshSession,
          setSession: vi.fn(),
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
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("exposes an error snapshot when Supabase auth is not configured", () => {
    const store = createAuthStateStore({
      getClient: () => null,
    });
    const snapshots: string[] = [];

    store.subscribe(() => {
      snapshots.push(store.getSnapshot().status);
    });

    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      errorCode: "configuration",
      session: null,
      status: "error",
    });
    expect(snapshots).toEqual(["error"]);
  });

  it("ignores an older startup session after the store restarts", async () => {
    const startupRequests: Array<
      (value: { data: { session: Session | null } }) => void
    > = [];
    const getSession = vi.fn(
      () =>
        new Promise<{ data: { session: Session | null } }>((resolve) => {
          startupRequests.push(resolve);
        }),
    );
    const unsubscribe = vi.fn();
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession,
          refreshSession: vi.fn(),
          setSession: vi.fn(),
          onAuthStateChange: () => ({
            data: {
              subscription: { unsubscribe },
            },
          }),
        },
      }),
    });

    const stopFirstSubscription = store.subscribe(() => undefined);
    await flushPromises();
    stopFirstSubscription();

    const stopSecondSubscription = store.subscribe(() => undefined);
    await flushPromises();

    expect(startupRequests).toHaveLength(2);

    startupRequests[1]?.({ data: { session: authenticatedSession } });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "authenticated",
    });

    startupRequests[0]?.({ data: { session: null } });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "session-token",
      status: "authenticated",
    });

    stopSecondSubscription();
  });

  it("keeps a newer auth event when the startup session resolves later", async () => {
    const startupSession = createDeferred<{
      data: { session: Session | null };
    }>();
    let handleAuthStateChange:
      | ((event: string, session: Session | null) => void)
      | undefined;
    const newerSession = {
      ...authenticatedSession,
      access_token: "newer-token",
    };
    const getSession = vi.fn(() => startupSession.promise);
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession,
          refreshSession: vi.fn(),
          setSession: vi.fn(),
          onAuthStateChange: (handler) => {
            handleAuthStateChange = handler;
            return {
              data: {
                subscription: { unsubscribe: vi.fn() },
              },
            };
          },
        },
      }),
    });

    store.subscribe(() => undefined);
    await flushPromises();
    expect(getSession).toHaveBeenCalledOnce();
    handleAuthStateChange?.("SIGNED_IN", newerSession);
    startupSession.resolve({ data: { session: authenticatedSession } });
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "newer-token",
      status: "authenticated",
    });
  });

  it("distinguishes session restore failures from missing configuration", async () => {
    const store = createAuthStateStore({
      getClient: () => ({
        auth: {
          getSession: async () => {
            throw new Error("session unavailable");
          },
          refreshSession: vi.fn(),
          setSession: vi.fn(),
          onAuthStateChange: () => ({
            data: {
              subscription: { unsubscribe: vi.fn() },
            },
          }),
        },
      }),
    });

    store.subscribe(() => undefined);
    await flushPromises();

    expect(store.getSnapshot()).toMatchObject({
      errorCode: "session",
      status: "error",
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
