import { z } from "zod";

export const apiErrorDetailSchema = z.object({
  code: z.string().trim().min(1, "api.error.code.required"),
  message: z.string().trim().min(1, "api.error.message.required"),
  requestId: z
    .string()
    .trim()
    .min(1, "api.error.request_id.required")
    .optional(),
  retryable: z.boolean().optional(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorDetailSchema,
});

export const errorCodeSchema = z.enum([
  "invalid_json",
  "invalid_input",
  "invalid_request_body",
  "not_authenticated",
  "not_found",
  "payload_too_large",
  "rate_limited",
  "auth_unavailable",
  "analysis_failed",
  "analysis_timeout",
  "invalid_analysis_response",
  "internal_error",
  "unknown_error",
]);

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export function readApiErrorDetail(
  payload: unknown,
  fallbackMessage: string,
): ApiErrorDetail {
  const parsed = apiErrorResponseSchema.safeParse(payload);

  if (parsed.success) {
    return parsed.data.error;
  }

  return {
    code: "unknown_error",
    message: fallbackMessage,
  };
}

export function readApiErrorMessage(
  payload: unknown,
  fallbackMessage: string,
): string {
  const parsed = apiErrorResponseSchema.safeParse(payload);

  if (parsed.success) {
    return parsed.data.error.message;
  }

  if (isRecord(payload) && isRecord(payload.error)) {
    return typeof payload.error.message === "string"
      ? payload.error.message
      : fallbackMessage;
  }

  return fallbackMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
