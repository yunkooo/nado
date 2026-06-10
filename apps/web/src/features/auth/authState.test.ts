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
    ) => void = (_event: string, _session: Session | null) => undefined;
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
      session: null,
      status: "error",
    });
    expect(snapshots).toEqual(["error"]);
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
