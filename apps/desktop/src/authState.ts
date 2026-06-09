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

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSnapshot(toAuthStateSnapshot(nextSession));
    });

    subscription = data.subscription;

    client.auth
      .getSession()
      .then(({ data: sessionData }) => {
        setSnapshot(toAuthStateSnapshot(sessionData.session));
      })
      .catch(() => {
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
