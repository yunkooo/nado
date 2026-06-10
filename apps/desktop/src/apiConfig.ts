export const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.VITE_NADO_API_BASE_URL as string | undefined);
export const NADO_PRODUCTION_API_BASE_URL =
  "https://nadoapi-production.up.railway.app";

export const apiBaseUrl = resolveDesktopApiBaseUrl({
  configuredApiBaseUrl,
  isDev: import.meta.env.DEV,
});

export function resolveDesktopApiBaseUrl({
  configuredApiBaseUrl: baseUrl,
  isDev,
}: {
  configuredApiBaseUrl: string | undefined;
  isDev: boolean;
}) {
  if (isDev) {
    return undefined;
  }

  return normalizeHttpBaseUrl(baseUrl) ?? NADO_PRODUCTION_API_BASE_URL;
}

export function resolveApiUrl(
  path: string,
  baseUrl = apiBaseUrl,
  isDev = import.meta.env.DEV,
) {
  const resolvedBaseUrl =
    baseUrl ??
    resolveDesktopApiBaseUrl({
      configuredApiBaseUrl: baseUrl,
      isDev,
    });

  if (!resolvedBaseUrl?.trim()) {
    return path;
  }

  return `${resolvedBaseUrl.trim().replace(/\/+$/, "")}${path}`;
}

function normalizeHttpBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl?.trim()) {
    return undefined;
  }

  try {
    const url = new URL(baseUrl.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}
