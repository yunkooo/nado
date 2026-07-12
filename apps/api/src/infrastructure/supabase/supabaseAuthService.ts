import type { AuthService } from "../../features/auth/authService.js";
import {
  createUserSupabaseClient,
  type SupabaseBackendOptions,
} from "./supabaseClient.js";
import { createSupabaseUnavailableError } from "./supabaseErrors.js";

export function createSupabaseAuthService(
  options: SupabaseBackendOptions = {},
): AuthService {
  return {
    async getUser(accessToken: string): Promise<{ id: string } | null> {
      const client = createUserSupabaseClient(undefined, options);

      try {
        const { data, error } = await client.auth.getUser(accessToken);

        if (error) {
          if (isUnauthenticatedAuthError(error)) {
            return null;
          }

          throw createSupabaseUnavailableError(
            "auth user lookup",
            new Error(error.message),
          );
        }

        return data.user ? { id: data.user.id } : null;
      } catch (error) {
        if (isSupabaseUnavailableError(error)) {
          throw error;
        }

        throw createSupabaseUnavailableError("auth user lookup", error);
      }
    },
  };
}

function isUnauthenticatedAuthError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const status = error.status ?? error.statusCode;

  return typeof status === "number" && [400, 401, 403].includes(status);
}

function isSupabaseUnavailableError(error: unknown) {
  return (
    isRecord(error) &&
    error.code === "supabase_unavailable" &&
    error.status === 503
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
