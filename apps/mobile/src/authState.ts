import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { Linking } from "react-native";
import {
  completeMobileAuthFromCallbackUrl,
  getMobileSupabaseClient,
  toMobileAuthSnapshot,
} from "./authClient";

export type MobileAuthStateStatus =
  | "anonymous"
  | "authenticated"
  | "error"
  | "loading";

export type MobileAuthStateSnapshot = {
  accessToken: string | null;
  session: Session | null;
  status: MobileAuthStateStatus;
};

const loadingSnapshot: MobileAuthStateSnapshot = {
  accessToken: null,
  session: null,
  status: "loading",
};

const errorSnapshot: MobileAuthStateSnapshot = {
  accessToken: null,
  session: null,
  status: "error",
};

export function createMobileAuthStateStore() {
  const listeners = new Set<() => void>();
  let snapshot = loadingSnapshot;
  let subscription: { unsubscribe(): void } | null = null;
  let urlSubscription: { remove(): void } | null = null;
  let hasStarted = false;

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setSnapshot = (nextSnapshot: MobileAuthStateSnapshot) => {
    snapshot = nextSnapshot;
    notify();
  };

  const start = () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;

    const supabase = getMobileSupabaseClient();

    if (!supabase) {
      setSnapshot(errorSnapshot);
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSnapshot(toMobileAuthSnapshot(session));
    });
    subscription = data.subscription;

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          void completeMobileAuthFromCallbackUrl(url, supabase);
        }
      })
      .catch(() => undefined);

    urlSubscription = Linking.addEventListener("url", ({ url }) => {
      void completeMobileAuthFromCallbackUrl(url, supabase);
    });

    supabase.auth
      .getSession()
      .then(({ data: sessionData }) => {
        setSnapshot(toMobileAuthSnapshot(sessionData.session));
      })
      .catch(() => {
        setSnapshot(errorSnapshot);
      });
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

        if (listeners.size === 0) {
          urlSubscription?.remove();
          urlSubscription = null;
          subscription?.unsubscribe();
          subscription = null;
          hasStarted = false;
        }
      };
    },
  };
}

const mobileAuthStateStore = createMobileAuthStateStore();

export function useMobileAuthState() {
  return useSyncExternalStore(
    mobileAuthStateStore.subscribe,
    mobileAuthStateStore.getSnapshot,
    mobileAuthStateStore.getSnapshot,
  );
}
