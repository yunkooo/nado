import { normalizeVocabularyTerm, vocabularyItemSchema } from "@nado/shared";
import type {
  SaveVocabularyRequest,
  VocabularyItem,
  VocabularyMeaning,
  VocabularyType,
} from "@nado/shared";

export type VocabularyRow = {
  created_at: string;
  id: string;
  meanings: VocabularyMeaning[];
  normalized_term: string;
  term: string;
  type: VocabularyType;
  updated_at: string;
  user_id: string;
};

export type NewVocabularyRow = {
  created_at: string;
  meanings: VocabularyMeaning[];
  term: string;
  type: VocabularyType;
  updated_at: string;
  user_id: string;
};

export type VocabularyStore = {
  deleteByUserId(id: string, userId: string): Promise<boolean>;
  findByUserTerm(
    userId: string,
    normalizedTerm: string,
    type: VocabularyType,
  ): Promise<VocabularyRow | null>;
  insert(row: NewVocabularyRow): Promise<VocabularyRow>;
  listByUser(userId: string): Promise<VocabularyRow[]>;
  updateMeanings(
    id: string,
    userId: string,
    meanings: VocabularyMeaning[],
    updatedAt: string,
  ): Promise<VocabularyRow | null>;
};

export type VocabularyServiceOptions = {
  now?: () => string;
  store: VocabularyStore;
};

export function createVocabularyService(options: VocabularyServiceOptions) {
  const now = options.now ?? (() => new Date().toISOString());
  const store = options.store;

  return {
    async delete(userId: string, id: string): Promise<boolean> {
      return store.deleteByUserId(id, userId);
    },

    async list(userId: string): Promise<VocabularyItem[]> {
      const rows = await store.listByUser(userId);

      return rows.map(toVocabularyItem);
    },

    async save(
      userId: string,
      request: SaveVocabularyRequest,
    ): Promise<VocabularyItem> {
      const timestamp = now();
      const term = normalizeDisplayTerm(request.term);
      const normalizedTerm = normalizeVocabularyTerm(term);
      const meaning = createMeaning(request, timestamp);
      const existing = await store.findByUserTerm(
        userId,
        normalizedTerm,
        request.type,
      );

      if (!existing) {
        const inserted = await store.insert({
          created_at: timestamp,
          meanings: [meaning],
          term,
          type: request.type,
          updated_at: timestamp,
          user_id: userId,
        });

        return toVocabularyItem(inserted);
      }

      if (hasMeaning(existing.meanings, meaning)) {
        return toVocabularyItem(existing);
      }

      const updated = await store.updateMeanings(
        existing.id,
        userId,
        [...existing.meanings, meaning],
        timestamp,
      );

      if (!updated) {
        throw new Error("Vocabulary item was not found for update.");
      }

      return toVocabularyItem(updated);
    },
  };
}

function createMeaning(
  request: SaveVocabularyRequest,
  createdAt: string,
): VocabularyMeaning {
  const note = request.note?.trim();

  return {
    createdAt,
    meaning: request.meaning.trim(),
    ...(note ? { note } : {}),
  };
}

function hasMeaning(
  meanings: VocabularyMeaning[],
  meaning: VocabularyMeaning,
): boolean {
  return meanings.some(
    (candidate) =>
      candidate.meaning.trim() === meaning.meaning &&
      (candidate.note?.trim() ?? "") === (meaning.note ?? ""),
  );
}

function normalizeDisplayTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

function toVocabularyItem(row: VocabularyRow): VocabularyItem {
  return vocabularyItemSchema.parse({
    createdAt: row.created_at,
    id: row.id,
    meanings: row.meanings,
    term: row.term,
    type: row.type,
    updatedAt: row.updated_at,
  });
}
