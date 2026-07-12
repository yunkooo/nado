import { z } from "zod";

export const vocabularyTypeSchema = z.enum(["word", "phrase"]);

export const MAX_VOCABULARY_TERM_LENGTH = 200;
export const MAX_VOCABULARY_MEANING_LENGTH = 500;
export const MAX_VOCABULARY_NOTE_LENGTH = 500;
export const MAX_VOCABULARY_MEANINGS_PER_ITEM = 20;
export const VOCABULARY_API_PAGE_SIZE = 100;
export const VOCABULARY_MAX_API_PAGES = 100;
export const MAX_VOCABULARY_CURSOR_LENGTH = 512;

export const vocabularyMeaningSchema = z.object({
  meaning: z.string().trim().min(1, "vocabulary.meaning.required"),
  note: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
});

export const vocabularyItemSchema = z.object({
  id: z.string(),
  term: z.string(),
  type: vocabularyTypeSchema,
  meanings: z.array(vocabularyMeaningSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const saveVocabularyRequestSchema = z
  .object({
    term: z
      .string()
      .trim()
      .min(1, "vocabulary.term.required")
      .max(MAX_VOCABULARY_TERM_LENGTH, "vocabulary.term.too_long"),
    type: vocabularyTypeSchema,
    meaning: z
      .string()
      .trim()
      .min(1, "vocabulary.meaning.required")
      .max(MAX_VOCABULARY_MEANING_LENGTH, "vocabulary.meaning.too_long"),
    note: z
      .string()
      .trim()
      .max(MAX_VOCABULARY_NOTE_LENGTH, "vocabulary.note.too_long")
      .optional(),
  })
  .transform((request) => {
    const note = getDistinctVocabularyNote(request.note, [request.meaning]);

    if (!note) {
      return {
        meaning: request.meaning,
        term: request.term,
        type: request.type,
      };
    }

    return {
      ...request,
      note,
    };
  });

export const vocabularyListResponseSchema = z.object({
  items: z.array(vocabularyItemSchema),
  nextCursor: z.string().nullable().default(null),
});

export const saveVocabularyResponseSchema = z.object({
  item: vocabularyItemSchema,
});

export const deleteVocabularyMeaningRequestSchema = vocabularyMeaningSchema;

export const deleteVocabularyMeaningResponseSchema = z.discriminatedUnion(
  "itemDeleted",
  [
    z.object({
      item: vocabularyItemSchema,
      itemDeleted: z.literal(false),
    }),
    z.object({
      item: z.null(),
      itemDeleted: z.literal(true),
    }),
  ],
);

export type VocabularyType = z.infer<typeof vocabularyTypeSchema>;
export type VocabularyMeaning = z.infer<typeof vocabularyMeaningSchema>;
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
export type SaveVocabularyRequest = z.infer<typeof saveVocabularyRequestSchema>;
export type VocabularyListResponse = z.infer<
  typeof vocabularyListResponseSchema
>;
export type SaveVocabularyResponse = z.infer<
  typeof saveVocabularyResponseSchema
>;
export type DeleteVocabularyMeaningRequest = z.infer<
  typeof deleteVocabularyMeaningRequestSchema
>;
export type DeleteVocabularyMeaningResponse = z.infer<
  typeof deleteVocabularyMeaningResponseSchema
>;

export type VocabularySuggestionMatch = {
  meaning: string;
  note?: string;
  term: string;
  type: VocabularyType;
};

export function normalizeVocabularyTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getDistinctVocabularyNote(
  note: string | undefined,
  referenceTexts: string[],
): string {
  const trimmedNote = note?.trim() ?? "";

  if (!trimmedNote) {
    return "";
  }

  const normalizedNote = normalizeComparableVocabularyText(trimmedNote);
  const isDuplicate = referenceTexts.some(
    (referenceText) =>
      normalizeComparableVocabularyText(referenceText) === normalizedNote,
  );

  return isDuplicate ? "" : trimmedNote;
}

export function createVocabularyMeaningRenderKey(
  itemId: string,
  meaning: VocabularyMeaning,
  index: number,
): string {
  return `${itemId}-${meaning.createdAt ?? "pending"}-${meaning.meaning}-${index}`;
}

export function createVocabularyMeaningMutationKey(
  itemId: string,
  meaning: VocabularyMeaning,
): string {
  return JSON.stringify([
    itemId,
    meaning.meaning,
    meaning.note ?? "",
    meaning.createdAt ?? "",
  ]);
}

export function isVocabularySuggestionSaved(
  items: VocabularyItem[],
  suggestion: VocabularySuggestionMatch,
) {
  const suggestionTerm = normalizeVocabularyTerm(suggestion.term);
  const suggestionMeaning = suggestion.meaning.trim();
  const suggestionNote = getDistinctVocabularyNote(suggestion.note, [
    suggestionMeaning,
  ]);

  return items.some((item) => {
    if (
      item.type !== suggestion.type ||
      normalizeVocabularyTerm(item.term) !== suggestionTerm
    ) {
      return false;
    }

    return item.meanings.some(
      (meaning) =>
        meaning.meaning.trim() === suggestionMeaning &&
        getDistinctVocabularyNote(meaning.note, [meaning.meaning]) ===
          suggestionNote,
    );
  });
}

export function createVocabularySuggestionKey(
  suggestion: VocabularySuggestionMatch,
): string {
  return JSON.stringify([
    suggestion.type,
    suggestion.term,
    suggestion.meaning,
    suggestion.note ?? "",
  ]);
}

function normalizeComparableVocabularyText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
