export const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.VITE_NADO_API_BASE_URL as string | undefined);

export const apiBaseUrl = import.meta.env.DEV
  ? undefined
  : configuredApiBaseUrl;

export function resolveApiUrl(path: string, baseUrl = apiBaseUrl) {
  if (!baseUrl?.trim()) {
    return path;
  }

  return `${baseUrl.trim().replace(/\/+$/, "")}${path}`;
}
