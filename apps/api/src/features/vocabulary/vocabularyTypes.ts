import type { SaveVocabularyRequest, VocabularyItem } from "@nado/shared";

export type VocabularyService = {
  delete(userId: string, id: string): Promise<boolean>;
  list(userId: string): Promise<VocabularyItem[]>;
  save(userId: string, request: SaveVocabularyRequest): Promise<VocabularyItem>;
};

export type VocabularyServiceFactory = (
  accessToken: string,
) => VocabularyService;
