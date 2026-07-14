import {
  createVocabularyMeaningMutationKey,
  type VocabularyItem,
} from "@nado/shared/vocabulary";

export type MobileVocabularyDeleteRequest = {
  heldAtReadyRevision: number | null;
  meaningKey: string;
  readyRevisionAtStart: number;
};

export type MobileVocabularyReadySnapshot = {
  items: VocabularyItem[];
  revision: number;
};

export function shouldReleaseMobileVocabularyDeleteRequest({
  itemId,
  readySnapshot,
  request,
}: {
  itemId: string;
  readySnapshot: MobileVocabularyReadySnapshot;
  request: MobileVocabularyDeleteRequest;
}) {
  if (readySnapshot.revision <= request.readyRevisionAtStart) {
    return false;
  }

  const item = readySnapshot.items.find(
    (vocabularyItem) => vocabularyItem.id === itemId,
  );

  if (!item) {
    return true;
  }

  return !item.meanings.some(
    (meaning) =>
      createVocabularyMeaningMutationKey(itemId, meaning) ===
      request.meaningKey,
  );
}

export function shouldReleaseHeldMobileVocabularyDeleteRequest({
  itemId,
  readySnapshot,
  request,
}: {
  itemId: string;
  readySnapshot: MobileVocabularyReadySnapshot;
  request: MobileVocabularyDeleteRequest;
}) {
  return (
    request.heldAtReadyRevision !== null &&
    readySnapshot.revision > request.heldAtReadyRevision &&
    shouldReleaseMobileVocabularyDeleteRequest({
      itemId,
      readySnapshot,
      request,
    })
  );
}
