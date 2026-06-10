import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { readMobileApiBaseUrl } from "./apiConfig";
import type { MobileAuthStateSnapshot } from "./authState";
import {
  applyDeleteVocabularyError,
  type MobileVocabularyState,
} from "./mobileVocabularyState";
import { deleteVocabularyItem, listVocabulary } from "./vocabularyApi";

export type { MobileVocabularyState } from "./mobileVocabularyState";

export type MobileVocabularyActions = {
  deleteItem(itemId: string): Promise<void>;
  deletingItemId: string | null;
};

const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiPlatform = Platform.OS;

const initialVocabularyState: MobileVocabularyState = {
  items: [],
  message: null,
  status: "idle",
};

export function useMobileVocabulary(
  authState: MobileAuthStateSnapshot,
): [MobileVocabularyState, MobileVocabularyActions] {
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [vocabularyState, setVocabularyState] = useState<MobileVocabularyState>(
    initialVocabularyState,
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadVocabulary(accessToken: string) {
      setVocabularyState((currentState) => ({
        items: currentState.items,
        message: null,
        status: "loading",
      }));

      const result = await listVocabulary(accessToken, {
        apiBaseUrl: configuredMobileApiBaseUrl,
        apiPlatform: configuredMobileApiPlatform,
      });

      if (!isCurrent) {
        return;
      }

      if (result.status === "success") {
        setVocabularyState({
          items: result.data,
          message: null,
          status: "ready",
        });
        return;
      }

      setVocabularyState({
        items: [],
        message: result.message,
        status: "error",
      });
    }

    if (authState.status === "loading") {
      return () => {
        isCurrent = false;
      };
    }

    if (authState.status !== "authenticated" || !authState.accessToken) {
      setVocabularyState(initialVocabularyState);
      return () => {
        isCurrent = false;
      };
    }

    void loadVocabulary(authState.accessToken);

    return () => {
      isCurrent = false;
    };
  }, [authState.accessToken, authState.status]);

  const deleteItem = async (itemId: string) => {
    if (authState.status !== "authenticated" || !authState.accessToken) {
      return;
    }

    setDeletingItemId(itemId);
    const result = await deleteVocabularyItem(itemId, authState.accessToken, {
      apiBaseUrl: configuredMobileApiBaseUrl,
      apiPlatform: configuredMobileApiPlatform,
    });
    setDeletingItemId(null);

    if (result.status !== "success") {
      setVocabularyState((currentState) =>
        applyDeleteVocabularyError(currentState, result.message),
      );
      return;
    }

    setVocabularyState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== itemId),
      message: null,
      status: "ready",
    }));
  };

  return [
    vocabularyState,
    {
      deleteItem,
      deletingItemId,
    },
  ];
}
