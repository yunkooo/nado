import { useEffect, useRef, useState } from "react";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  deleteVocabularyItem as deleteVocabularyItemFromApi,
  type DeleteVocabularyResult,
} from "../../api/vocabularyApi";
import { vocabularyStateStore } from "./vocabularyState";

type VocabularyDeleteRequestSnapshot = {
  accessToken: string;
  itemId: string;
  requestId: number;
};

type VocabularyDeleteState = {
  accessToken: string | null;
  deletingItemIds: ReadonlySet<string>;
  message: string | null;
};

export function useVocabularyDeleteAction(authState: AuthStateSnapshot) {
  const [deleteState, setDeleteState] = useState<VocabularyDeleteState>({
    accessToken: null,
    deletingItemIds: new Set(),
    message: null,
  });
  const latestAccessTokenRef = useRef(authState.accessToken);
  const requestSequenceRef = useRef(0);
  const requestsByItemRef = useRef(
    new Map<string, VocabularyDeleteRequestSnapshot>(),
  );

  latestAccessTokenRef.current = authState.accessToken;

  useEffect(() => {
    latestAccessTokenRef.current = authState.accessToken;
    requestSequenceRef.current += 1;
    requestsByItemRef.current.clear();
    setDeleteState({
      accessToken:
        authState.status === "authenticated" ? authState.accessToken : null,
      deletingItemIds: new Set(),
      message: null,
    });
  }, [authState.accessToken, authState.status]);

  const isDeleteScopeCurrent =
    authState.status === "authenticated" &&
    deleteState.accessToken === authState.accessToken;
  const deleteMessage = isDeleteScopeCurrent ? deleteState.message : null;
  const deletingItemIds = isDeleteScopeCurrent
    ? deleteState.deletingItemIds
    : new Set<string>();

  const deleteItem = async (itemId: string) => {
    const accessToken = authState.accessToken;

    if (!accessToken) {
      return;
    }

    const currentItemRequest = requestsByItemRef.current.get(itemId);

    if (currentItemRequest?.accessToken === accessToken) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    const request = { accessToken, itemId, requestId };
    requestsByItemRef.current.set(itemId, request);

    setDeleteState((currentState) => ({
      accessToken,
      deletingItemIds: new Set([
        ...(currentState.accessToken === accessToken
          ? currentState.deletingItemIds
          : []),
        itemId,
      ]),
      message: null,
    }));

    const result = await deleteVocabularyItemFromApi(itemId, accessToken);
    const currentRequest = requestsByItemRef.current.get(itemId);

    if (
      !currentRequest ||
      !shouldApplyVocabularyMutation(
        accessToken,
        latestAccessTokenRef.current,
      ) ||
      !isCurrentVocabularyDeleteRequest(request, currentRequest)
    ) {
      return;
    }

    requestsByItemRef.current.delete(itemId);

    const finishDelete = (message: string | null) => {
      setDeleteState((currentState) => {
        if (currentState.accessToken !== accessToken) {
          return currentState;
        }

        const nextDeletingItemIds = new Set(currentState.deletingItemIds);
        nextDeletingItemIds.delete(itemId);

        return {
          accessToken,
          deletingItemIds: nextDeletingItemIds,
          message,
        };
      });
    };

    if (shouldRemoveVocabularyItemAfterDelete(result)) {
      vocabularyStateStore.removeItem(itemId);
      finishDelete(null);
      return;
    }

    finishDelete(result.message);
  };

  return {
    deleteItem,
    deleteMessage,
    deletingItemIds,
  };
}

export function isCurrentVocabularyDeleteRequest(
  request: VocabularyDeleteRequestSnapshot,
  current: VocabularyDeleteRequestSnapshot,
) {
  return (
    request.accessToken === current.accessToken &&
    request.itemId === current.itemId &&
    request.requestId === current.requestId
  );
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
