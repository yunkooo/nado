import { useEffect, useRef, useState } from "react";
import {
  createVocabularyMeaningMutationKey,
  type VocabularyMeaning,
} from "@nado/shared/vocabulary";
import type { AuthStateSnapshot } from "../../auth/authState";
import { deleteVocabularyMeaning as deleteVocabularyMeaningFromApi } from "../../api/vocabularyApi";
import { vocabularyStateStore } from "./vocabularyState";

type VocabularyDeleteRequestSnapshot = {
  accessToken: string;
  itemId: string;
  meaningKey: string;
  requestId: number;
};

type VocabularyDeleteState = {
  accessToken: string | null;
  deletingMeaningKeys: ReadonlySet<string>;
  message: string | null;
};

export function useVocabularyDeleteAction(authState: AuthStateSnapshot) {
  const [deleteState, setDeleteState] = useState<VocabularyDeleteState>({
    accessToken: null,
    deletingMeaningKeys: new Set(),
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
      deletingMeaningKeys: new Set(),
      message: null,
    });
  }, [authState.accessToken, authState.status]);

  const isDeleteScopeCurrent =
    authState.status === "authenticated" &&
    deleteState.accessToken === authState.accessToken;
  const deleteMessage = isDeleteScopeCurrent ? deleteState.message : null;
  const deletingMeaningKeys = isDeleteScopeCurrent
    ? deleteState.deletingMeaningKeys
    : new Set<string>();

  const deleteMeaning = async (itemId: string, meaning: VocabularyMeaning) => {
    const accessToken = authState.accessToken;

    if (!accessToken) {
      return;
    }

    const currentItemRequest = requestsByItemRef.current.get(itemId);

    if (currentItemRequest?.accessToken === accessToken) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    const meaningKey = createVocabularyMeaningMutationKey(itemId, meaning);
    requestSequenceRef.current = requestId;
    const request = { accessToken, itemId, meaningKey, requestId };
    requestsByItemRef.current.set(itemId, request);

    setDeleteState((currentState) => ({
      accessToken,
      deletingMeaningKeys: new Set([
        ...(currentState.accessToken === accessToken
          ? currentState.deletingMeaningKeys
          : []),
        meaningKey,
      ]),
      message: null,
    }));

    const result = await deleteVocabularyMeaningFromApi(
      itemId,
      meaning,
      accessToken,
    );
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

        const nextDeletingMeaningKeys = new Set(
          currentState.deletingMeaningKeys,
        );
        nextDeletingMeaningKeys.delete(meaningKey);

        return {
          accessToken,
          deletingMeaningKeys: nextDeletingMeaningKeys,
          message,
        };
      });
    };

    if (result.status === "success") {
      if (result.data.itemDeleted) {
        vocabularyStateStore.removeItem(itemId);
      } else {
        vocabularyStateStore.upsertItem(result.data.item);
      }

      finishDelete(null);
      return;
    }

    finishDelete(result.message);
  };

  return {
    deleteMeaning,
    deleteMessage,
    deletingMeaningKeys,
  };
}

export function isCurrentVocabularyDeleteRequest(
  request: VocabularyDeleteRequestSnapshot,
  current: VocabularyDeleteRequestSnapshot,
) {
  return (
    request.accessToken === current.accessToken &&
    request.itemId === current.itemId &&
    request.meaningKey === current.meaningKey &&
    request.requestId === current.requestId
  );
}

export function shouldApplyVocabularyMutation(
  requestAccessToken: string,
  currentAccessToken: string | null,
) {
  return requestAccessToken === currentAccessToken;
}
