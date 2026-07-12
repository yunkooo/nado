import {
  createAnalysisUsageService,
  type AnalysisUsageConsumeResult,
  type AnalysisUsageStore,
  type UsageIdentity,
} from "../../features/analysis/analysisUsageService.js";
import {
  DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
  DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
  readAnalysisDailyLimit,
} from "../../features/analysis/config/analysisLimits.js";
import {
  resolveServiceRoleSupabaseRequestConfig,
  type SupabaseBackendOptions,
  type ServiceRoleSupabaseRequestConfig,
} from "./supabaseClient.js";
import {
  createSupabaseInvalidResponseError,
  createSupabaseUnavailableError,
} from "./supabaseErrors.js";

export function createSupabaseAnalysisUsageService(
  options: SupabaseBackendOptions = {},
) {
  return createAnalysisUsageService({
    anonymousDailyLimit: readAnalysisDailyLimit(
      process.env.NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
      {
        defaultValue: DEFAULT_ANONYMOUS_DAILY_ANALYSIS_LIMIT,
        name: "NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT",
      },
    ),
    authenticatedDailyLimit: readAnalysisDailyLimit(
      process.env.NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
      {
        defaultValue: DEFAULT_AUTHENTICATED_DAILY_ANALYSIS_LIMIT,
        name: "NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT",
      },
    ),
    store: createSupabaseAnalysisUsageStore(
      resolveServiceRoleSupabaseRequestConfig(options),
    ),
  });
}

function createSupabaseAnalysisUsageStore(
  config: ServiceRoleSupabaseRequestConfig,
): AnalysisUsageStore {
  return {
    async consumeUsage(
      identity: UsageIdentity,
      periodStart: string,
      limit: number,
    ): Promise<AnalysisUsageConsumeResult> {
      let response: Response;

      try {
        response = await config.fetch(
          `${config.supabaseUrl}/rest/v1/rpc/consume_analysis_usage`,
          {
            body: JSON.stringify({
              p_ip_hash: identity.ipHash,
              p_limit: limit,
              p_period_start: periodStart,
              p_user_id: identity.userId,
            }),
            headers: createServiceRoleHeaders(config.serviceRoleKey),
            method: "POST",
          },
        );
      } catch (error) {
        throw createSupabaseUnavailableError("usage consume", error);
      }

      if (!response.ok) {
        throw createSupabaseUnavailableError(
          "usage consume",
          new Error(`Supabase usage RPC returned HTTP ${response.status}.`),
        );
      }

      let data: unknown;

      try {
        data = await response.json();
      } catch (error) {
        throw createSupabaseInvalidResponseError("usage consume", error);
      }

      return toAnalysisUsageConsumeResult(data);
    },
  };
}

function createServiceRoleHeaders(serviceRoleKey: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.pgrst.object+json",
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
  };

  if (!serviceRoleKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${serviceRoleKey}`;
  }

  return headers;
}

function toAnalysisUsageConsumeResult(
  value: unknown,
): AnalysisUsageConsumeResult {
  if (!isRecord(value)) {
    throw createSupabaseInvalidResponseError("usage consume");
  }

  return {
    consumed: readBoolean(value, "consumed"),
    requestCount: readNumber(value, "request_count"),
  };
}

function readNumber(value: Record<string, unknown>, key: string): number {
  const field = value[key];

  if (typeof field !== "number") {
    throw createSupabaseInvalidResponseError(
      "usage consume",
      new Error(`Supabase row field ${key} was not a number.`),
    );
  }

  return field;
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];

  if (typeof field !== "boolean") {
    throw createSupabaseInvalidResponseError(
      "usage consume",
      new Error(`Supabase row field ${key} was not a boolean.`),
    );
  }

  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
