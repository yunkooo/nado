import { isTauriRuntime } from "./authClient";

export type ApiFetchInput = Request | URL | string;
export type ApiFetcher = (
  input: ApiFetchInput,
  init?: RequestInit,
) => Promise<Response>;

type TauriFetchLoader = () => Promise<ApiFetcher>;

export type ApiFetchOptions = {
  browserFetch?: ApiFetcher;
  isTauri?: () => boolean;
  loadTauriFetch?: TauriFetchLoader;
};

export function createApiFetch({
  browserFetch = globalThis.fetch.bind(globalThis),
  isTauri = isTauriRuntime,
  loadTauriFetch = loadTauriHttpFetch,
}: ApiFetchOptions = {}): ApiFetcher {
  return async (input, init) => {
    if (shouldUseTauriHttpFetch(input, isTauri())) {
      const tauriFetch = await loadTauriFetch();

      return tauriFetch(input, init);
    }

    return browserFetch(input, init);
  };
}

export function shouldUseTauriHttpFetch(
  input: ApiFetchInput,
  isTauri: boolean,
) {
  if (!isTauri) {
    return false;
  }

  const url = readRequestUrl(input);

  return url?.protocol === "http:" || url?.protocol === "https:";
}

export const apiFetch = createApiFetch();

async function loadTauriHttpFetch(): Promise<ApiFetcher> {
  const { fetch } = await import("@tauri-apps/plugin-http");

  return fetch;
}

function readRequestUrl(input: ApiFetchInput): URL | null {
  try {
    if (typeof input === "string" || input instanceof URL) {
      return new URL(input);
    }

    return new URL(input.url);
  } catch {
    return null;
  }
}
