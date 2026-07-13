import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { shouldRefreshVocabularyFromLifecycle } from "@nado/shared/vocabulary-realtime";
import { readMobileApiBaseUrl } from "../../api/apiConfig";
import { listVocabulary } from "../../api/vocabularyApi";
import type { MobileAuthStateSnapshot } from "../../auth/authState";
import {
  applyLoadVocabularyError,
  type MobileVocabularyState,
} from "./mobileVocabularyState";
import {
  createMobileVocabularyLoadCoordinator,
  type MobileVocabularyRefreshResult,
} from "./mobileVocabularyLoadCoordinator";
import { useMobileVocabularyRealtimeSync } from "./useMobileVocabularyRealtimeSync";

export type MobileVocabularyStateUpdater = (
  resolveState: (currentState: MobileVocabularyState) => MobileVocabularyState,
) => void;

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

const initialVocabularyState: MobileVocabularyState = {
  items: [],
  message: null,
  status: "idle",
};

export function useMobileVocabularyLoader({
  authState,
  isStudySurfaceActive,
  refreshKey,
}: {
  authState: MobileAuthStateSnapshot;
  isStudySurfaceActive: boolean;
  refreshKey: unknown;
}) {
  const [vocabularyState, setVocabularyState] = useState<MobileVocabularyState>(
    initialVocabularyState,
  );
  const [readyRevision, setReadyRevision] = useState(0);
  const accessTokenRef = useRef<string | null>(null);
  const lastLoadedAtRef = useRef<number | undefined>(undefined);
  const latestAuthStateRef = useRef(authState);
  const loadCoordinatorRef = useRef(createMobileVocabularyLoadCoordinator());
  const requestSequenceRef = useRef(0);
  const statusRef = useRef<MobileVocabularyState["status"]>(
    initialVocabularyState.status,
  );

  useLayoutEffect(() => {
    latestAuthStateRef.current = authState;
  }, [authState]);

  const updateVocabularyState = useCallback<MobileVocabularyStateUpdater>(
    (resolveState) => {
      setVocabularyState((currentState) => {
        const nextState = resolveState(currentState);
        statusRef.current = nextState.status;
        return nextState;
      });
    },
    [],
  );

  const loadVocabulary = useCallback(
    (
      accessToken: string,
      options: {
        force?: boolean;
        preserveCurrentOnError: boolean;
        showLoading: boolean;
      },
    ) => {
      const { force = false, preserveCurrentOnError, showLoading } = options;

      if (
        !force &&
        !showLoading &&
        !shouldRefreshVocabularyFromLifecycle({
          isStudySurfaceActive: true,
          lastLoadedAt: lastLoadedAtRef.current,
          now: Date.now(),
          status: statusRef.current,
        })
      ) {
        return Promise.resolve<MobileVocabularyRefreshResult>("ignored");
      }

      return loadCoordinatorRef.current.run(
        accessToken,
        { force },
        async ({ isQueuedRefresh }) => {
          const shouldPreserveCurrent = isQueuedRefresh
            ? true
            : preserveCurrentOnError;
          const shouldShowLoading = isQueuedRefresh ? false : showLoading;
          requestSequenceRef.current += 1;
          const requestId = requestSequenceRef.current;
          accessTokenRef.current = accessToken;

          if (shouldShowLoading) {
            updateVocabularyState((currentState) => ({
              items: currentState.items,
              message: null,
              status: "loading",
            }));
          }

          const result = await listVocabulary(accessToken, {
            apiBaseUrl: configuredMobileApiBaseUrl,
            apiPlatform: configuredMobileApiPlatform,
          });

          if (
            requestId !== requestSequenceRef.current ||
            accessTokenRef.current !== accessToken
          ) {
            return "ignored";
          }

          if (result.status === "success") {
            lastLoadedAtRef.current = Date.now();
            updateVocabularyState(() => ({
              items: result.data,
              message: null,
              status: "ready",
            }));
            setReadyRevision((currentRevision) => currentRevision + 1);
            return "refreshed";
          }

          updateVocabularyState((currentState) =>
            applyLoadVocabularyError(currentState, {
              message: result.message,
              preserveCurrentOnError: shouldPreserveCurrent,
            }),
          );
          return "failed";
        },
      );
    },
    [updateVocabularyState],
  );

  const refreshVocabularyInBackground = useCallback(
    (options?: { force?: boolean }) => {
      const latestAuthState = latestAuthStateRef.current;

      if (
        latestAuthState.status !== "authenticated" ||
        !latestAuthState.accessToken
      ) {
        return Promise.resolve<MobileVocabularyRefreshResult>("ignored");
      }

      return loadVocabulary(latestAuthState.accessToken, {
        force: options?.force ?? false,
        preserveCurrentOnError: true,
        showLoading: false,
      });
    },
    [loadVocabulary],
  );

  useEffect(() => {
    const latestAuthState = latestAuthStateRef.current;

    if (latestAuthState.status === "loading") {
      return;
    }

    if (
      latestAuthState.status !== "authenticated" ||
      !latestAuthState.accessToken
    ) {
      requestSequenceRef.current += 1;
      loadCoordinatorRef.current.cancel();
      accessTokenRef.current = null;
      lastLoadedAtRef.current = undefined;
      updateVocabularyState(() => initialVocabularyState);
      return;
    }

    void loadVocabulary(latestAuthState.accessToken, {
      preserveCurrentOnError: false,
      showLoading: true,
    });
  }, [
    authState.accessToken,
    authState.session?.user.id,
    authState.status,
    loadVocabulary,
    updateVocabularyState,
  ]);

  useEffect(() => {
    if (
      !isStudySurfaceActive ||
      authState.status !== "authenticated" ||
      !authState.accessToken
    ) {
      return;
    }

    void refreshVocabularyInBackground();
  }, [
    authState.accessToken,
    authState.status,
    isStudySurfaceActive,
    refreshVocabularyInBackground,
    refreshKey,
  ]);

  useEffect(() => {
    if (!isStudySurfaceActive) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshVocabularyInBackground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isStudySurfaceActive, refreshVocabularyInBackground]);

  useMobileVocabularyRealtimeSync({
    authState,
    refreshVocabularyInBackground,
  });

  return {
    readyRevision,
    refreshVocabularyInBackground,
    updateVocabularyState,
    vocabularyState,
  };
}
