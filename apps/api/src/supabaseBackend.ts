import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { vocabularyMeaningSchema } from "@nado/shared";
import {
  createAnalysisUsageService,
  type AnalysisUsageConsumeResult,
  type AnalysisUsageStore,
  type UsageIdentity,
} from "./analysisUsageService.js";
import {
  createVocabularyService,
  type NewVocabularyRow,
  type VocabularyRow,
  type VocabularyStore,
} from "./vocabularyService.js";

export type SupabaseBackendOptions = {
  anonKey?: string;
  serviceRoleKey?: string;
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

export function createSupabaseAnalysisUsageService(
  options: SupabaseBackendOptions = {},
) {
  return createAnalysisUsageService({
    anonymousDailyLimit: readIntegerEnv(
      process.env.NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
    ),
    authenticatedDailyLimit: readIntegerEnv(
      process.env.NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
    ),
    store: createSupabaseAnalysisUsageStore(
      createServiceRoleSupabaseClient(options),
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

function createServiceRoleSupabaseClient(
  options: SupabaseBackendOptions,
): SupabaseClient {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    options.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function createSupabaseAnalysisUsageStore(
  client: Pick<SupabaseClient, "rpc">,
): AnalysisUsageStore {
  return {
    async consumeUsage(
      identity: UsageIdentity,
      periodStart: string,
      limit: number,
    ): Promise<AnalysisUsageConsumeResult> {
      const { data, error } = await client
        .rpc("consume_analysis_usage", {
          p_ip_hash: identity.ipHash,
          p_limit: limit,
          p_period_start: periodStart,
          p_user_id: identity.userId,
        })
        .single();

      if (error) {
        throw new Error(`Supabase usage consume failed: ${error.message}`);
      }

      return toAnalysisUsageConsumeResult(data);
    },
  };
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

function toAnalysisUsageConsumeResult(
  value: unknown,
): AnalysisUsageConsumeResult {
  if (!isRecord(value)) {
    throw new Error("Supabase usage row was not an object.");
  }

  return {
    consumed: readBoolean(value, "consumed"),
    requestCount: readNumber(value, "request_count"),
  };
}

function readIntegerEnv(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];

  if (typeof field !== "string") {
    throw new Error(`Supabase vocabulary row field ${key} was not a string.`);
  }

  return field;
}

function readNumber(value: Record<string, unknown>, key: string): number {
  const field = value[key];

  if (typeof field !== "number") {
    throw new Error(`Supabase row field ${key} was not a number.`);
  }

  return field;
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];

  if (typeof field !== "boolean") {
    throw new Error(`Supabase row field ${key} was not a boolean.`);
  }

  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
