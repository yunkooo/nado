import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { Linking } from "react-native";
import {
  completeMobileAuthFromCallbackUrl,
  getMobileSupabaseClient,
  toMobileAuthSnapshot,
  type MobileAuthCallbackResult,
} from "./authClient";

export type MobileAuthStateStatus =
  | "anonymous"
  | "authenticated"
  | "error"
  | "loading";

export type MobileAuthStateSnapshot = {
  accessToken: string | null;
  message: string | null;
  session: Session | null;
  status: MobileAuthStateStatus;
};

type MobileAuthStateClient = NonNullable<
  ReturnType<typeof getMobileSupabaseClient>
>;

type MobileAuthStateDependencies = {
  completeCallback?: (
    url: string,
    client: MobileAuthStateClient,
  ) => Promise<MobileAuthCallbackResult>;
  getClient?: () => MobileAuthStateClient | null;
  linking?: {
    addEventListener(
      event: "url",
      listener: (event: { url: string }) => void,
    ): { remove(): void };
    getInitialURL(): Promise<string | null>;
  };
};

const MOBILE_AUTH_STATE_ERROR_MESSAGE =
  "로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
const MOBILE_AUTH_CALLBACK_ERROR_MESSAGE =
  "Google 로그인을 완료하지 못했어요. 다시 시도해 주세요.";

const loadingSnapshot: MobileAuthStateSnapshot = {
  accessToken: null,
  message: null,
  session: null,
  status: "loading",
};

function createErrorSnapshot(message: string): MobileAuthStateSnapshot {
  return {
    accessToken: null,
    message,
    session: null,
    status: "error",
  };
}

export function createMobileAuthStateStore({
  completeCallback = completeMobileAuthFromCallbackUrl,
  getClient = getMobileSupabaseClient,
  linking = Linking,
}: MobileAuthStateDependencies = {}) {
  const listeners = new Set<() => void>();
  let snapshot = loadingSnapshot;
  let subscription: { unsubscribe(): void } | null = null;
  let urlSubscription: { remove(): void } | null = null;
  let hasStarted = false;
  let lifecycleVersion = 0;
  let operationSequence = 0;

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
    const currentLifecycleVersion = lifecycleVersion + 1;
    lifecycleVersion = currentLifecycleVersion;
    snapshot = loadingSnapshot;

    const supabase = getClient();

    if (!supabase) {
      setSnapshot(createErrorSnapshot(MOBILE_AUTH_STATE_ERROR_MESSAGE));
      return;
    }

    const isCurrentOperation = (operationId: number) =>
      hasStarted &&
      lifecycleVersion === currentLifecycleVersion &&
      operationSequence === operationId;

    const handleCallbackUrl = async (url: string) => {
      const operationId = operationSequence + 1;
      operationSequence = operationId;

      try {
        const result = await completeCallback(url, supabase);

        if (!isCurrentOperation(operationId)) {
          return;
        }

        if (result === "error") {
          setSnapshot(createErrorSnapshot(MOBILE_AUTH_CALLBACK_ERROR_MESSAGE));
          return;
        }

        const { data } = await supabase.auth.getSession();

        if (isCurrentOperation(operationId)) {
          setSnapshot(toMobileAuthSnapshot(data.session));
        }
      } catch {
        if (isCurrentOperation(operationId)) {
          setSnapshot(createErrorSnapshot(MOBILE_AUTH_CALLBACK_ERROR_MESSAGE));
        }
      }
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      operationSequence += 1;

      if (hasStarted && lifecycleVersion === currentLifecycleVersion) {
        setSnapshot(toMobileAuthSnapshot(session));
      }
    });
    subscription = data.subscription;

    linking
      .getInitialURL()
      .then((url) => {
        if (url) {
          void handleCallbackUrl(url);
        }
      })
      .catch(() => undefined);

    urlSubscription = linking.addEventListener("url", ({ url }) => {
      void handleCallbackUrl(url);
    });

    const sessionOperationId = operationSequence + 1;
    operationSequence = sessionOperationId;
    supabase.auth
      .getSession()
      .then(({ data: sessionData }) => {
        if (isCurrentOperation(sessionOperationId)) {
          setSnapshot(toMobileAuthSnapshot(sessionData.session));
        }
      })
      .catch(() => {
        if (isCurrentOperation(sessionOperationId)) {
          setSnapshot(createErrorSnapshot(MOBILE_AUTH_STATE_ERROR_MESSAGE));
        }
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
          lifecycleVersion += 1;
          operationSequence += 1;
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
