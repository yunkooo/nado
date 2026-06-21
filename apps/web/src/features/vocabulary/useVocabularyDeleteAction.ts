"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthStateSnapshot } from "../auth/authState";
import {
  deleteVocabularyItem as deleteVocabularyItemFromApi,
  type DeleteVocabularyResult,
} from "./vocabularyApi";
import { vocabularyStateStore } from "./vocabularyState";

type VocabularyDeleteRequestSnapshot = {
  accessToken: string | null;
  requestId: number;
};

export function isCurrentVocabularyDeleteRequest(
  request: VocabularyDeleteRequestSnapshot,
  current: VocabularyDeleteRequestSnapshot,
) {
  return (
    request.accessToken === current.accessToken &&
    request.requestId === current.requestId
  );
}

export function useVocabularyDeleteAction(authState: AuthStateSnapshot) {
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const latestAccessTokenRef = useRef(authState.accessToken);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    latestAccessTokenRef.current = authState.accessToken;
    requestSequenceRef.current += 1;
    setDeleteMessage(null);
    setDeletingItemId(null);
  }, [authState.accessToken, authState.status]);

  const deleteItem = async (itemId: string) => {
    const accessToken = authState.accessToken;

    if (!accessToken) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    latestAccessTokenRef.current = accessToken;

    setDeletingItemId(itemId);

    const result = await deleteVocabularyItemFromApi(itemId, accessToken);
    const request = { accessToken, requestId };
    const currentRequest = {
      accessToken: latestAccessTokenRef.current,
      requestId: requestSequenceRef.current,
    };

    if (!isCurrentVocabularyDeleteRequest(request, currentRequest)) {
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

export function shouldRemoveVocabularyItemAfterDelete(
  result: DeleteVocabularyResult,
) {
  return result.status === "success" || result.status === "not-found";
}
