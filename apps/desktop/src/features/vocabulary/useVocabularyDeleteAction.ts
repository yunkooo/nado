import { useEffect, useRef, useState } from "react";
import {
  createVocabularyMeaningMutationKey,
  type VocabularyItem,
  type VocabularyMeaning,
} from "@nado/shared/vocabulary";
import type { AuthStateSnapshot } from "../../auth/authState";
import {
  deleteVocabularyMeaning as deleteVocabularyMeaningFromApi,
  VOCABULARY_ERROR_MESSAGE,
} from "../../api/vocabularyApi";
import {
  refreshVocabularyForAuth,
  vocabularyStateStore,
} from "./vocabularyState";

type VocabularyDeleteRequestSnapshot = {
  accessToken: string;
  heldAtReadyRevision: number | null;
  itemId: string;
  meaningKey: string;
  readyRevisionAtStart: number;
  requestId: number;
};

type VocabularyDeleteState = {
  accessToken: string | null;
  deletingMeaningKeys: ReadonlySet<string>;
  message: string | null;
};

function hasVocabularyDeleteTarget(
  items: VocabularyItem[],
  itemId: string,
  meaningKey: string,
) {
  return items.some(
    (item) =>
      item.id === itemId &&
      item.meanings.some(
        (meaning) =>
          createVocabularyMeaningMutationKey(itemId, meaning) === meaningKey,
      ),
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

  useEffect(
    () =>
      vocabularyStateStore.subscribe(() => {
        const vocabularyState = vocabularyStateStore.getSnapshot();

        if (
          vocabularyState.status !== "ready" ||
          !vocabularyState.accessToken
        ) {
          return;
        }

        const readyRevision = vocabularyStateStore.getReadyRevision();
        const releasedMeaningKeys = new Set<string>();

        for (const [itemId, request] of requestsByItemRef.current) {
          if (
            request.accessToken !== vocabularyState.accessToken ||
            request.heldAtReadyRevision === null ||
            request.heldAtReadyRevision >= readyRevision ||
            hasVocabularyDeleteTarget(
              vocabularyState.items,
              itemId,
              request.meaningKey,
            )
          ) {
            continue;
          }

          requestsByItemRef.current.delete(itemId);
          releasedMeaningKeys.add(request.meaningKey);
        }

        if (releasedMeaningKeys.size === 0) {
          return;
        }

        const hasHeldRequest = Array.from(
          requestsByItemRef.current.values(),
        ).some(
          (request) =>
            request.accessToken === vocabularyState.accessToken &&
            request.heldAtReadyRevision !== null,
        );

        setDeleteState((currentState) => {
          if (currentState.accessToken !== vocabularyState.accessToken) {
            return currentState;
          }

          const nextDeletingMeaningKeys = new Set(
            currentState.deletingMeaningKeys,
          );

          for (const meaningKey of releasedMeaningKeys) {
            nextDeletingMeaningKeys.delete(meaningKey);
          }

          return {
            ...currentState,
            deletingMeaningKeys: nextDeletingMeaningKeys,
            message: hasHeldRequest ? currentState.message : null,
          };
        });
      }),
    [],
  );

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
    const request = {
      accessToken,
      heldAtReadyRevision: null,
      itemId,
      meaningKey,
      readyRevisionAtStart: vocabularyStateStore.getReadyRevision(),
      requestId,
    };
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

    const finishDelete = (message: string | null) => {
      const trackedRequest = requestsByItemRef.current.get(itemId);

      if (
        trackedRequest &&
        !isCurrentVocabularyDeleteRequest(request, trackedRequest)
      ) {
        return;
      }

      requestsByItemRef.current.delete(itemId);
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

    const holdDelete = (message: string) => {
      const trackedRequest = requestsByItemRef.current.get(itemId);

      if (
        !trackedRequest ||
        !isCurrentVocabularyDeleteRequest(request, trackedRequest)
      ) {
        return;
      }

      const readyRevision = vocabularyStateStore.getReadyRevision();
      const vocabularyState = vocabularyStateStore.getSnapshot();
      const targetMeaningExists = hasVocabularyDeleteTarget(
        vocabularyState.items,
        itemId,
        meaningKey,
      );

      if (
        vocabularyState.status === "ready" &&
        vocabularyState.accessToken === accessToken &&
        readyRevision > trackedRequest.readyRevisionAtStart &&
        !targetMeaningExists
      ) {
        finishDelete(null);
        return;
      }

      requestsByItemRef.current.set(itemId, {
        ...trackedRequest,
        heldAtReadyRevision: readyRevision,
      });

      setDeleteState((currentState) =>
        currentState.accessToken === accessToken
          ? { ...currentState, message }
          : currentState,
      );
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

    if (result.status === "not-found") {
      try {
        const refreshResult = await refreshVocabularyForAuth(authState, {
          force: true,
        });

        if (refreshResult === "refreshed") {
          finishDelete(null);
        } else {
          holdDelete(VOCABULARY_ERROR_MESSAGE);
        }
      } catch {
        holdDelete(VOCABULARY_ERROR_MESSAGE);
      }
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
