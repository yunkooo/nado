import {
  BadGatewayError,
  ServiceUnavailableError,
} from "../../shared/errors/httpErrors.js";

export function createSupabaseUnavailableError(
  operation: string,
  cause?: unknown,
) {
  return new ServiceUnavailableError(
    "supabase_unavailable",
    "데이터 서비스를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    {
      cause: cause ?? new Error(`Supabase ${operation} failed.`),
      retryable: true,
    },
  );
}

export function createSupabaseInvalidResponseError(
  operation: string,
  cause?: unknown,
) {
  return new BadGatewayError(
    "supabase_invalid_response",
    "데이터 응답 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
    {
      cause: cause ?? new Error(`Supabase ${operation} response was invalid.`),
      retryable: true,
    },
  );
}
