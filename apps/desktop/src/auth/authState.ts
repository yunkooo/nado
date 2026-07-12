import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./authClient";

export type AuthStateStatus =
  | "anonymous"
  | "authenticated"
  | "error"
  | "loading";

export type AuthStateSnapshot = {
  accessToken: string | null;
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
  now?: () => number;
};

const STARTUP_SESSION_REFRESH_LEEWAY_MS = 5 * 60 * 1000;

const loadingSnapshot: AuthStateSnapshot = {
  accessToken: null,
  session: null,
  status: "loading",
};

const errorSnapshot: AuthStateSnapshot = {
  accessToken: null,
  session: null,
  status: "error",
};

export function createAuthStateStore(options: AuthStateStoreOptions = {}) {
  const getClient =
    options.getClient ??
    (() => getSupabaseBrowserClient() as AuthStateClient | null);
  const now = options.now ?? Date.now;
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
    startupSequence += 1;
    const startupId = startupSequence;
    let isResolvingInitialSession = true;

    const client = getClient();

    if (!client) {
      setSnapshot(errorSnapshot);
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

    resolveStartupSession(client, now)
      .then((session) => {
        if (startupId !== startupSequence || !isResolvingInitialSession) {
          return;
        }

        isResolvingInitialSession = false;
        setSnapshot(toAuthStateSnapshot(session));
      })
      .catch(() => {
        if (startupId !== startupSequence || !isResolvingInitialSession) {
          return;
        }

        isResolvingInitialSession = false;
        setSnapshot(errorSnapshot);
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

const authStateStore = createAuthStateStore();

export function getAuthStateSnapshot(): AuthStateSnapshot {
  return authStateStore.getSnapshot();
}

export function useAuthState(): AuthStateSnapshot {
  return useSyncExternalStore(
    authStateStore.subscribe,
    authStateStore.getSnapshot,
    authStateStore.getSnapshot,
  );
}

async function resolveStartupSession(
  client: AuthStateClient,
  now: () => number,
): Promise<Session | null> {
  const { data } = await client.auth.getSession();
  const session = data.session;

  if (!session) {
    return null;
  }

  if (!shouldRefreshStartupSession(session, now())) {
    return session;
  }

  const refreshed = await client.auth.refreshSession(session);

  if (refreshed.error) {
    return null;
  }

  return refreshed.data.session;
}

function shouldRefreshStartupSession(session: Session, now: number) {
  if (typeof session.expires_at !== "number") {
    return true;
  }

  return session.expires_at * 1000 - now <= STARTUP_SESSION_REFRESH_LEEWAY_MS;
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
