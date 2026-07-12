"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  completeAuthFromCurrentUrl,
  getSupabaseBrowserClient,
} from "./authClient";

export type AuthStateStatus =
  | "anonymous"
  | "authenticated"
  | "error"
  | "loading";

export type AuthStateErrorCode = "configuration" | "oauth_callback" | "session";

export type AuthStateSnapshot = {
  accessToken: string | null;
  errorCode?: AuthStateErrorCode;
  session: Session | null;
  status: AuthStateStatus;
};

type AuthStateChangeHandler = (event: string, session: Session | null) => void;

export type AuthStateClient = {
  auth: {
    getSession(): Promise<{
      data: {
        session: Session | null;
      };
    }>;
    refreshSession(currentSession?: Session): Promise<{
      data: {
        session: Session | null;
      };
      error: unknown;
    }>;
    setSession(session: {
      access_token: string;
      refresh_token: string;
    }): Promise<{ error: unknown }>;
    onAuthStateChange(handler: AuthStateChangeHandler): {
      data: {
        subscription: {
          unsubscribe(): void;
        };
      };
    };
  };
};

export type AuthStateStoreOptions = {
  getClient?: () => AuthStateClient | null;
};

const loadingSnapshot: AuthStateSnapshot = {
  accessToken: null,
  session: null,
  status: "loading",
};

export function createAuthStateStore(options: AuthStateStoreOptions = {}) {
  const getClient =
    options.getClient ??
    (() => getSupabaseBrowserClient() as AuthStateClient | null);
  const listeners = new Set<() => void>();
  let snapshot = loadingSnapshot;
  let subscription: { unsubscribe(): void } | null = null;
  let hasStarted = false;
  let startupSequence = 0;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setSnapshot = (nextSnapshot: AuthStateSnapshot) => {
    snapshot = nextSnapshot;
    notify();
  };

  const start = () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;
    snapshot = loadingSnapshot;
    startupSequence += 1;
    const startupId = startupSequence;
    let isResolvingInitialSession = true;

    const client = getClient();

    if (!client) {
      setSnapshot(createErrorSnapshot("configuration"));
      return;
    }

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (startupId !== startupSequence) {
        return;
      }

      if (isResolvingInitialSession && event === "INITIAL_SESSION") {
        return;
      }

      isResolvingInitialSession = false;
      setSnapshot(toAuthStateSnapshot(nextSession));
    });

    subscription = data.subscription;

    const authCallbackResult =
      typeof window === "undefined"
        ? Promise.resolve("ignored" as const)
        : completeAuthFromCurrentUrl(new URL(window.location.href), client);

    authCallbackResult
      .then((result) => {
        if (startupId !== startupSequence || !isResolvingInitialSession) {
          return undefined;
        }

        if (result === "error") {
          isResolvingInitialSession = false;
          setSnapshot(createErrorSnapshot("oauth_callback"));
          return undefined;
        }

        return resolveStartupSession(client);
      })
      .then((session) => {
        if (startupId !== startupSequence || !isResolvingInitialSession) {
          return;
        }

        isResolvingInitialSession = false;

        if (session === undefined) {
          return;
        }

        setSnapshot(toAuthStateSnapshot(session));
      })
      .catch(() => {
        if (startupId !== startupSequence || !isResolvingInitialSession) {
          return;
        }

        isResolvingInitialSession = false;
        setSnapshot(createErrorSnapshot("session"));
      });
  };

  const stop = () => {
    if (listeners.size > 0) {
      return;
    }

    subscription?.unsubscribe();
    subscription = null;
    hasStarted = false;
    startupSequence += 1;
  };

  return {
    getSnapshot() {
      return snapshot;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      start();

      return () => {
        listeners.delete(listener);
        stop();
      };
    },
  };
}

function createErrorSnapshot(errorCode: AuthStateErrorCode): AuthStateSnapshot {
  return {
    accessToken: null,
    errorCode,
    session: null,
    status: "error",
  };
}

const authStateStore = createAuthStateStore();

export function useAuthState(): AuthStateSnapshot {
  return useSyncExternalStore(
    authStateStore.subscribe,
    authStateStore.getSnapshot,
    authStateStore.getSnapshot,
  );
}

async function resolveStartupSession(
  client: AuthStateClient,
): Promise<Session | null> {
  const { data } = await client.auth.getSession();
  return data.session;
}

function toAuthStateSnapshot(session: Session | null): AuthStateSnapshot {
  if (!session) {
    return {
      accessToken: null,
      session: null,
      status: "anonymous",
    };
  }

  return {
    accessToken: session.access_token,
    session,
    status: "authenticated",
  };
}
