"use client";

import { useEffect, useRef, useState } from "react";
import {
  createVocabularyMeaningMutationKey,
  type VocabularyMeaning,
} from "@nado/shared/vocabulary";
import type { AuthStateSnapshot } from "../auth/authState";
import { deleteVocabularyMeaning as deleteVocabularyMeaningFromApi } from "./vocabularyApi";
import { vocabularyStateStore } from "./vocabularyState";

type VocabularyDeleteRequestSnapshot = {
  accessToken: string | null;
  itemId: string;
  meaningKey: string;
  requestId: number;
};

type VocabularyDeleteState = {
  accessToken: string | null;
  deletingMeaningKeys: ReadonlySet<string>;
  message: string | null;
};

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
  const isDeleteScopeCurrent =
    authState.status === "authenticated" &&
    deleteState.accessToken === authState.accessToken;
  const deleteMessage = isDeleteScopeCurrent ? deleteState.message : null;
  const deletingMeaningKeys = isDeleteScopeCurrent
    ? deleteState.deletingMeaningKeys
    : new Set<string>();

  useEffect(() => {
    latestAccessTokenRef.current = authState.accessToken;
    requestSequenceRef.current += 1;
    requestsByItemRef.current.clear();
  }, [authState.accessToken, authState.status]);

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
    latestAccessTokenRef.current = accessToken;
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
      latestAccessTokenRef.current !== accessToken ||
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
