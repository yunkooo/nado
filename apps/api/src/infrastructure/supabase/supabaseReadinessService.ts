import type { ReadinessService } from "../../app/routes/healthRoutes.js";
import {
  createServiceRoleSupabaseClient,
  type SupabaseBackendOptions,
} from "./supabaseClient.js";
import { createSupabaseUnavailableError } from "./supabaseErrors.js";

export function createSupabaseReadinessService(
  options: SupabaseBackendOptions = {},
): ReadinessService {
  const client = createServiceRoleSupabaseClient(options);

  return {
    async check() {
      let result;

      try {
        result = await client
          .from("analysis_usage_limits")
          .select("id")
          .limit(1);
      } catch (error) {
        throw createSupabaseUnavailableError("readiness check", error);
      }

      if (result.error) {
        throw createSupabaseUnavailableError(
          "readiness check",
          new Error(result.error.message),
        );
      }
    },
  };
}
