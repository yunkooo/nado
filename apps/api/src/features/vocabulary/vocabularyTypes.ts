import type {
  SaveVocabularyRequest,
  VocabularyItem,
} from "@nado/shared/vocabulary";
import type { VocabularyPage } from "./vocabularyService.js";

export type VocabularyService = {
  delete(userId: string, id: string): Promise<boolean>;
  list(userId: string, cursor?: string): Promise<VocabularyPage>;
  save(userId: string, request: SaveVocabularyRequest): Promise<VocabularyItem>;
};

export type VocabularyServiceFactory = (
  accessToken: string,
) => VocabularyService;
