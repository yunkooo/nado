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
};

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
  const listeners = new Set<() => void>();
  let snapshot = loadingSnapshot;
  let subscription: { unsubscribe(): void } | null = null;
  let hasStarted = false;
  let isResolvingInitialSession = false;

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

    const client = getClient();

    if (!client) {
      setSnapshot(errorSnapshot);
      return;
    }

    isResolvingInitialSession = true;

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (isResolvingInitialSession && event === "INITIAL_SESSION") {
        return;
      }

      setSnapshot(toAuthStateSnapshot(nextSession));
    });

    subscription = data.subscription;

    resolveStartupSession(client)
      .then((session) => {
        isResolvingInitialSession = false;
        setSnapshot(toAuthStateSnapshot(session));
      })
      .catch(() => {
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
    isResolvingInitialSession = false;
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
  const session = data.session;

  if (!session) {
    return null;
  }

  const refreshed = await client.auth.refreshSession(session);

  if (refreshed.error) {
    return null;
  }

  return refreshed.data.session;
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
