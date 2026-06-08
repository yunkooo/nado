import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { vocabularyMeaningSchema } from "@nado/shared";
import {
  createVocabularyService,
  type NewVocabularyRow,
  type VocabularyRow,
  type VocabularyStore,
} from "./vocabularyService.js";

export type SupabaseBackendOptions = {
  anonKey?: string;
  supabaseUrl?: string;
};

const VOCABULARY_COLUMNS =
  "id,user_id,term,normalized_term,type,meanings,created_at,updated_at";

export function createSupabaseAuthService(
  options: SupabaseBackendOptions = {},
) {
  return {
    async getUser(accessToken: string): Promise<{ id: string } | null> {
      const client = createServerSupabaseClient(undefined, options);
      const { data, error } = await client.auth.getUser(accessToken);

      if (error || !data.user) {
        return null;
      }

      return { id: data.user.id };
    },
  };
}

export function createSupabaseVocabularyService(
  accessToken: string,
  options: SupabaseBackendOptions = {},
) {
  return createVocabularyService({
    store: createSupabaseVocabularyStore(
      createServerSupabaseClient(accessToken, options),
    ),
  });
}

function createServerSupabaseClient(
  accessToken: string | undefined,
  options: SupabaseBackendOptions,
): SupabaseClient {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL;
  const anonKey = options.anonKey ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  });
}

function createSupabaseVocabularyStore(
  client: Pick<SupabaseClient, "from">,
): VocabularyStore {
  return {
    async deleteByUserId(id: string, userId: string): Promise<boolean> {
      const { data, error } = await client
        .from("vocabulary_items")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(`Supabase vocabulary delete failed: ${error.message}`);
      }

      return Boolean(data);
    },

    async findByUserTerm(
      userId: string,
      normalizedTerm: string,
      type: "word" | "phrase",
    ): Promise<VocabularyRow | null> {
      const { data, error } = await client
        .from("vocabulary_items")
        .select(VOCABULARY_COLUMNS)
        .eq("user_id", userId)
        .eq("normalized_term", normalizedTerm)
        .eq("type", type)
        .maybeSingle();

      if (error) {
        throw new Error(`Supabase vocabulary lookup failed: ${error.message}`);
      }

      return data ? toVocabularyRow(data) : null;
    },

    async insert(row: NewVocabularyRow): Promise<VocabularyRow> {
      const { data, error } = await client
        .from("vocabulary_items")
        .insert({
          created_at: row.created_at,
          meanings: row.meanings,
          term: row.term,
          type: row.type,
          updated_at: row.updated_at,
          user_id: row.user_id,
        })
        .select(VOCABULARY_COLUMNS)
        .single();

      if (error) {
        throw new Error(`Supabase vocabulary insert failed: ${error.message}`);
      }

      return toVocabularyRow(data);
    },

    async listByUser(userId: string): Promise<VocabularyRow[]> {
      const { data, error } = await client
        .from("vocabulary_items")
        .select(VOCABULARY_COLUMNS)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(`Supabase vocabulary list failed: ${error.message}`);
      }

      return (data ?? []).map(toVocabularyRow);
    },

    async updateMeanings(
      id: string,
      userId: string,
      meanings,
      updatedAt: string,
    ): Promise<VocabularyRow | null> {
      const { data, error } = await client
        .from("vocabulary_items")
        .update({
          meanings,
          updated_at: updatedAt,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select(VOCABULARY_COLUMNS)
        .maybeSingle();

      if (error) {
        throw new Error(`Supabase vocabulary update failed: ${error.message}`);
      }

      return data ? toVocabularyRow(data) : null;
    },
  };
}

function toVocabularyRow(value: unknown): VocabularyRow {
  if (!isRecord(value)) {
    throw new Error("Supabase vocabulary row was not an object.");
  }

  const type = value.type;

  if (type !== "word" && type !== "phrase") {
    throw new Error("Supabase vocabulary row had an invalid type.");
  }

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
