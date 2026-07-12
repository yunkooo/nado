import {
  vocabularyItemSchema,
  type SaveVocabularyRequest,
  type VocabularyItem,
  type VocabularyMeaning,
  type VocabularyType,
} from "@nado/shared/vocabulary";
import {
  decodeVocabularyCursor,
  encodeVocabularyCursor,
  type VocabularyCursor,
} from "./vocabularyCursor.js";

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
  meanings: VocabularyMeaning[];
  term: string;
  type: VocabularyType;
  user_id: string;
};

export type VocabularyStore = {
  deleteByUserId(id: string, userId: string): Promise<boolean>;
  listByUser(
    userId: string,
    cursor: VocabularyCursor | undefined,
  ): Promise<VocabularyRowsPage>;
  save(row: NewVocabularyRow): Promise<VocabularyRow>;
};

export type VocabularyRowsPage = {
  nextCursor: VocabularyCursor | null;
  rows: VocabularyRow[];
};

export type VocabularyPage = {
  items: VocabularyItem[];
  nextCursor: string | null;
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

    async list(userId: string, cursor?: string): Promise<VocabularyPage> {
      const page = await store.listByUser(
        userId,
        decodeVocabularyCursor(cursor),
      );

      return {
        items: page.rows.map(toVocabularyItem),
        nextCursor: page.nextCursor
          ? encodeVocabularyCursor(page.nextCursor)
          : null,
      };
    },

    async save(
      userId: string,
      request: SaveVocabularyRequest,
    ): Promise<VocabularyItem> {
      const timestamp = now();
      const term = normalizeDisplayTerm(request.term);
      const meaning = createMeaning(request, timestamp);
      const saved = await store.save({
        meanings: [meaning],
        term,
        type: request.type,
        user_id: userId,
      });

      return toVocabularyItem(saved);
    },
  };
}

function createMeaning(
  request: SaveVocabularyRequest,
  createdAt: string,
): VocabularyMeaning {
  const note = "note" in request ? request.note.trim() : "";

  return {
    createdAt,
    meaning: request.meaning.trim(),
    ...(note ? { note } : {}),
  };
}

function normalizeDisplayTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

function toVocabularyItem(row: VocabularyRow): VocabularyItem {
  return vocabularyItemSchema.parse({
    createdAt: toIsoDateTime(row.created_at),
    id: row.id,
    meanings: row.meanings,
    term: row.term,
    type: row.type,
    updatedAt: toIsoDateTime(row.updated_at),
  });
}

function toIsoDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}
