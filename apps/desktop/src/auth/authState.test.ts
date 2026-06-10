import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createAuthStateStore } from "./authState";

const staleSession = {
  access_token: "stale-token",
  refresh_token: "refresh-token",
  user: {
    email: "user@example.com",
  },
} as Session;

const refreshedSession = {
  ...staleSession,
  access_token: "fresh-token",
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
