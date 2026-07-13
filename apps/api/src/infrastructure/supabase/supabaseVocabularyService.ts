import {
  MAX_VOCABULARY_MEANINGS_PER_ITEM,
  VOCABULARY_API_PAGE_SIZE,
  vocabularyMeaningSchema,
  type DeleteVocabularyMeaningRequest,
} from "@nado/shared/vocabulary";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createVocabularyService,
  type DeleteVocabularyMeaningStoreResult,
  type NewVocabularyRow,
  type VocabularyRow,
  type VocabularyRowsPage,
  type VocabularyStore,
} from "../../features/vocabulary/vocabularyService.js";
import type { VocabularyCursor } from "../../features/vocabulary/vocabularyCursor.js";
import { ConflictError } from "../../shared/errors/httpErrors.js";
import {
  createUserSupabaseClient,
  type SupabaseBackendOptions,
} from "./supabaseClient.js";
import {
  createSupabaseInvalidResponseError,
  createSupabaseUnavailableError,
} from "./supabaseErrors.js";

const VOCABULARY_COLUMNS =
  "id,user_id,term,normalized_term,type,meanings,created_at,updated_at";

export function createSupabaseVocabularyService(
  accessToken: string,
  options: SupabaseBackendOptions = {},
) {
  return createVocabularyService({
    store: createSupabaseVocabularyStore(
      createUserSupabaseClient(accessToken, options),
    ),
  });
}

function createSupabaseVocabularyStore(
  client: Pick<SupabaseClient, "from" | "rpc">,
): VocabularyStore {
  return {
    async deleteByUserId(id: string, userId: string): Promise<boolean> {
      let result;

      try {
        result = await client
          .from("vocabulary_items")
          .delete()
          .eq("id", id)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle();
      } catch (error) {
        throw createSupabaseUnavailableError("vocabulary delete", error);
      }

      if (result.error) {
        throw createSupabaseUnavailableError(
          "vocabulary delete",
          new Error(result.error.message),
        );
      }

      return Boolean(result.data);
    },

    async deleteMeaningByUserId(
      id: string,
      userId: string,
      meaning: DeleteVocabularyMeaningRequest,
    ): Promise<DeleteVocabularyMeaningStoreResult | null> {
      let result;

      try {
        result = await client
          .rpc("delete_vocabulary_meaning", {
            p_item_id: id,
            p_meaning: meaning,
            p_user_id: userId,
          })
          .maybeSingle();
      } catch (error) {
        throw createSupabaseUnavailableError(
          "vocabulary meaning delete",
          error,
        );
      }

      if (result.error) {
        throw createSupabaseUnavailableError(
          "vocabulary meaning delete",
          new Error(result.error.message),
        );
      }

      return result.data
        ? toDeleteVocabularyMeaningStoreResult(result.data)
        : null;
    },

    async listByUser(
      userId: string,
      cursor: VocabularyCursor | undefined,
    ): Promise<VocabularyRowsPage> {
      let result;

      try {
        let query = client
          .from("vocabulary_items")
          .select(VOCABULARY_COLUMNS)
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(VOCABULARY_API_PAGE_SIZE + 1);

        if (cursor) {
          query = query.or(
            `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`,
          );
        }

        result = await query;
      } catch (error) {
        throw createSupabaseUnavailableError("vocabulary list", error);
      }

      if (result.error) {
        throw createSupabaseUnavailableError(
          "vocabulary list",
          new Error(result.error.message),
        );
      }

      const rows = (result.data ?? []).map(toVocabularyRow);
      const hasNextPage = rows.length > VOCABULARY_API_PAGE_SIZE;
      const pageRows = rows.slice(0, VOCABULARY_API_PAGE_SIZE);
      const lastRow = hasNextPage ? pageRows.at(-1) : undefined;

      return {
        nextCursor: lastRow
          ? {
              id: lastRow.id,
              updatedAt: new Date(lastRow.updated_at).toISOString(),
            }
          : null,
        rows: pageRows,
      };
    },

    async save(row: NewVocabularyRow): Promise<VocabularyRow> {
      const [meaning] = row.meanings;

      if (!meaning) {
        throw new Error("Supabase vocabulary save requires a meaning.");
      }

      let result;

      try {
        result = await client
          .rpc("save_vocabulary_item", {
            p_meaning: meaning,
            p_term: row.term,
            p_type: row.type,
            p_user_id: row.user_id,
          })
          .single();
      } catch (error) {
        throw createSupabaseUnavailableError("vocabulary save", error);
      }

      if (result.error) {
        throw createSupabaseUnavailableError(
          "vocabulary save",
          new Error(result.error.message),
        );
      }

      const saved = toVocabularyRow(result.data);

      if (!hasVocabularyMeaning(saved, meaning)) {
        throw new ConflictError(
          "vocabulary_meaning_limit_reached",
          `한 단어에는 뜻을 최대 ${MAX_VOCABULARY_MEANINGS_PER_ITEM}개까지 저장할 수 있어요.`,
        );
      }

      return saved;
    },
  };
}

function toDeleteVocabularyMeaningStoreResult(
  value: unknown,
): DeleteVocabularyMeaningStoreResult {
  if (!isRecord(value) || typeof value.item_deleted !== "boolean") {
    throw createSupabaseInvalidResponseError(
      "vocabulary meaning delete result",
    );
  }

  if (value.item_deleted) {
    if (value.item !== null) {
      throw createSupabaseInvalidResponseError(
        "vocabulary meaning delete result",
      );
    }

    return { itemDeleted: true, row: null };
  }

  return {
    itemDeleted: false,
    row: toVocabularyRow(value.item),
  };
}

function toVocabularyRow(value: unknown): VocabularyRow {
  if (!isRecord(value)) {
    throw createSupabaseInvalidResponseError("vocabulary row");
  }

  const type = value.type;

  if (type !== "word" && type !== "phrase") {
    throw createSupabaseInvalidResponseError(
      "vocabulary row",
      new Error("Supabase vocabulary row had an invalid type."),
    );
  }

  try {
    return {
      created_at: readString(value, "created_at"),
      id: readString(value, "id"),
      meanings: vocabularyMeaningSchema.array().parse(value.meanings),
      normalized_term: readString(value, "normalized_term"),
      term: readString(value, "term"),
      type,
      updated_at: readString(value, "updated_at"),
      user_id: readString(value, "user_id"),
    };
  } catch (error) {
    throw createSupabaseInvalidResponseError("vocabulary row", error);
  }
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];

  if (typeof field !== "string") {
    throw new Error(`Supabase vocabulary row field ${key} was not a string.`);
  }

  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasVocabularyMeaning(
  row: VocabularyRow,
  requestedMeaning: VocabularyRow["meanings"][number],
): boolean {
  return row.meanings.some(
    (meaning) =>
      meaning.meaning.trim() === requestedMeaning.meaning.trim() &&
      (meaning.note?.trim() ?? "") === (requestedMeaning.note?.trim() ?? ""),
  );
}
