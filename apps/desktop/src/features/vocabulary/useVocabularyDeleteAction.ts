import { useEffect, useRef, useState } from "react";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  deleteVocabularyItem as deleteVocabularyItemFromApi,
  type DeleteVocabularyResult,
} from "../../api/vocabularyApi";
import { vocabularyStateStore } from "./vocabularyState";

export function useVocabularyDeleteAction(authState: AuthStateSnapshot) {
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const currentAccessTokenRef = useRef(authState.accessToken);

  currentAccessTokenRef.current = authState.accessToken;

  useEffect(() => {
    currentAccessTokenRef.current = authState.accessToken;
    setDeleteMessage(null);
    setDeletingItemId(null);
  }, [authState.accessToken, authState.status]);

  const deleteItem = async (itemId: string) => {
    const accessToken = authState.accessToken;

    if (!accessToken) {
      return;
    }

    setDeletingItemId(itemId);

    const result = await deleteVocabularyItemFromApi(itemId, accessToken);

    if (
      !shouldApplyVocabularyMutation(accessToken, currentAccessTokenRef.current)
    ) {
      return;
    }

    setDeletingItemId(null);

    if (shouldRemoveVocabularyItemAfterDelete(result)) {
      vocabularyStateStore.removeItem(itemId);
      setDeleteMessage(null);
      return;
    }

    setDeleteMessage(result.message);
  };

  return {
    deleteItem,
    deleteMessage,
    deletingItemId,
  };
}

export function shouldApplyVocabularyMutation(
  requestAccessToken: string,
  currentAccessToken: string | null,
) {
  return requestAccessToken === currentAccessToken;
}

export function shouldRemoveVocabularyItemAfterDelete(
  result: DeleteVocabularyResult,
) {
  return result.status === "success" || result.status === "not-found";
}
