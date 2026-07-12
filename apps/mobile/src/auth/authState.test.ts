import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Linking: {
    addEventListener: vi.fn(),
    getInitialURL: vi.fn(),
  },
}));
vi.mock("./authClient", () => ({
  completeMobileAuthFromCallbackUrl: vi.fn(),
  getMobileSupabaseClient: vi.fn(() => null),
  toMobileAuthSnapshot: (session: Session | null) => ({
    accessToken: session?.access_token ?? null,
    message: null,
    session,
    status: session ? "authenticated" : "anonymous",
  }),
}));

import { createMobileAuthStateStore } from "./authState";

type AuthStateChangeHandler = (event: string, session: Session | null) => void;

function createSession(accessToken = "access-token") {
  return {
    access_token: accessToken,
    user: { id: "user-1" },
  } as Session;
}

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

function createAuthClient({
  getSession,
  onAuthStateChange,
}: {
  getSession: () => Promise<{ data: { session: Session | null } }>;
  onAuthStateChange: (handler: AuthStateChangeHandler) => {
    data: { subscription: { unsubscribe(): void } };
  };
}) {
  return {
    auth: {
      getSession,
      onAuthStateChange,
    },
  } as unknown as SupabaseClient;
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("createMobileAuthStateStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a callback error instead of discarding it", async () => {
    const client = createAuthClient({
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    });
    const store = createMobileAuthStateStore({
      completeCallback: vi.fn(() => Promise.resolve("error" as const)),
      getClient: () => client,
      linking: {
        addEventListener: vi.fn(() => ({ remove: vi.fn() })),
        getInitialURL: vi.fn(() =>
          Promise.resolve("nado://auth/callback?error=access_denied"),
        ),
      },
    });

    const unsubscribe = store.subscribe(() => undefined);
    await flushAsyncWork();

    expect(store.getSnapshot()).toMatchObject({
      message: "Google 로그인을 완료하지 못했어요. 다시 시도해 주세요.",
      status: "error",
    });
    unsubscribe();
  });

  it("settles the session when the initial URL is not an auth callback", async () => {
    const client = createAuthClient({
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    });
    const store = createMobileAuthStateStore({
      completeCallback: vi.fn(() => Promise.resolve("ignored" as const)),
      getClient: () => client,
      linking: {
        addEventListener: vi.fn(() => ({ remove: vi.fn() })),
        getInitialURL: vi.fn(() => Promise.resolve("nado://unrelated/path")),
      },
    });

    const unsubscribe = store.subscribe(() => undefined);
    await flushAsyncWork();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: null,
      message: null,
      status: "anonymous",
    });
    unsubscribe();
  });

  it("does not let a stale session lookup overwrite a newer auth event", async () => {
    const initialSession = createDeferred<{
      data: { session: Session | null };
    }>();
    const authStateChangeHandlerRef: {
      current: AuthStateChangeHandler | null;
    } = { current: null };
    const client = createAuthClient({
      getSession: vi.fn(() => initialSession.promise),
      onAuthStateChange: vi.fn((handler) => {
        authStateChangeHandlerRef.current = handler;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    });
    const store = createMobileAuthStateStore({
      getClient: () => client,
      linking: {
        addEventListener: vi.fn(() => ({ remove: vi.fn() })),
        getInitialURL: vi.fn(() => Promise.resolve(null)),
      },
    });

    const unsubscribe = store.subscribe(() => undefined);
    authStateChangeHandlerRef.current?.(
      "SIGNED_IN",
      createSession("new-token"),
    );
    initialSession.resolve({ data: { session: null } });
    await flushAsyncWork();

    expect(store.getSnapshot()).toMatchObject({
      accessToken: "new-token",
      message: null,
      status: "authenticated",
    });
    unsubscribe();
  });

  it("ignores callback results that finish after the last subscriber leaves", async () => {
    const callbackResult = createDeferred<"error">();
    const client = createAuthClient({
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    });
    const store = createMobileAuthStateStore({
      completeCallback: vi.fn(() => callbackResult.promise),
      getClient: () => client,
      linking: {
        addEventListener: vi.fn(() => ({ remove: vi.fn() })),
        getInitialURL: vi.fn(() =>
          Promise.resolve("nado://auth/callback?error=access_denied"),
        ),
      },
    });

    const unsubscribe = store.subscribe(() => undefined);
    await Promise.resolve();
    unsubscribe();
    callbackResult.resolve("error");
    await flushAsyncWork();

    expect(store.getSnapshot().status).not.toBe("error");
  });
});
