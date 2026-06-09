"use client";

import { useEffect, useState } from "react";
import type { AuthStateSnapshot } from "../authState";
import { deleteVocabularyItem as deleteVocabularyItemFromApi } from "../vocabularyApi";
import { vocabularyStateStore } from "../vocabularyState";

export function useVocabularyDeleteAction(authState: AuthStateSnapshot) {
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    setDeleteMessage(null);
    setDeletingItemId(null);
  }, [authState.accessToken, authState.status]);

  const deleteItem = async (itemId: string) => {
    if (!authState.accessToken) {
      return;
    }

    setDeletingItemId(itemId);

    const result = await deleteVocabularyItemFromApi(
      itemId,
      authState.accessToken,
    );

    setDeletingItemId(null);

    if (result.status === "success") {
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
