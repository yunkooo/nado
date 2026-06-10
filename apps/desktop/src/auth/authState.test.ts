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
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
