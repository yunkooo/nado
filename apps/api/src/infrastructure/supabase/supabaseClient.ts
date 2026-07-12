import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseFetch = typeof globalThis.fetch;

export type SupabaseBackendOptions = {
  anonKey?: string;
  fetch?: SupabaseFetch;
  serviceRoleKey?: string;
  supabaseUrl?: string;
  timeoutMs?: number;
};

export type ServiceRoleSupabaseRequestConfig = {
  fetch: SupabaseFetch;
  serviceRoleKey: string;
  supabaseUrl: string;
};

export const DEFAULT_SUPABASE_TIMEOUT_MS = 10_000;

export class SupabaseRequestTimeoutError extends Error {
  constructor() {
    super("Supabase request timed out.");
    this.name = "SupabaseRequestTimeoutError";
  }
}

export function createUserSupabaseClient(
  accessToken: string | undefined,
  options: SupabaseBackendOptions,
): SupabaseClient {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL;
  const anonKey = options.anonKey ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  }

  const timeoutMs = resolveSupabaseTimeoutMs(options);

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: {
      timeout: timeoutMs,
    },
    global: {
      fetch: createSupabaseFetchWithTimeout(
        options.fetch ?? globalThis.fetch,
        timeoutMs,
      ),
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  });
}

export function createServiceRoleSupabaseClient(
  options: SupabaseBackendOptions,
): SupabaseClient {
  const { fetch, serviceRoleKey, supabaseUrl } =
    resolveServiceRoleSupabaseRequestConfig(options);
  const timeoutMs = resolveSupabaseTimeoutMs(options);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: {
      timeout: timeoutMs,
    },
    global: {
      fetch,
    },
  });
}

export function resolveServiceRoleSupabaseRequestConfig(
  options: SupabaseBackendOptions,
): ServiceRoleSupabaseRequestConfig {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    options.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return {
    fetch: createServiceRoleSupabaseFetch(
      options.fetch ?? globalThis.fetch,
      serviceRoleKey,
      resolveSupabaseTimeoutMs(options),
    ),
    serviceRoleKey,
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
  };
}

function createServiceRoleSupabaseFetch(
  fetchImplementation: SupabaseFetch,
  serviceRoleKey: string,
  timeoutMs: number,
): SupabaseFetch {
  const fetchWithTimeout = createSupabaseFetchWithTimeout(
    fetchImplementation,
    timeoutMs,
  );

  if (!serviceRoleKey.startsWith("sb_secret_")) {
    return fetchWithTimeout;
  }

  return (input, init) => {
    const headers = new Headers(init?.headers);

    if (headers.get("Authorization") === `Bearer ${serviceRoleKey}`) {
      headers.delete("Authorization");
    }

    return fetchWithTimeout(input, {
      ...init,
      headers,
    });
  };
}

export function resolveSupabaseTimeoutMs(
  options: Pick<SupabaseBackendOptions, "timeoutMs"> = {},
): number {
  if (options.timeoutMs !== undefined) {
    return readPositiveInteger(options.timeoutMs, "Supabase timeout");
  }

  const configuredTimeout = process.env.SUPABASE_TIMEOUT_MS;

  if (!configuredTimeout?.trim()) {
    return DEFAULT_SUPABASE_TIMEOUT_MS;
  }

  return readPositiveInteger(Number(configuredTimeout), "SUPABASE_TIMEOUT_MS");
}

export function createSupabaseFetchWithTimeout(
  fetchImplementation: SupabaseFetch,
  timeoutMs: number,
): SupabaseFetch {
  return async (input, init) => {
    const abortController = new AbortController();
    const externalSignal = init?.signal;
    const abortFromExternalSignal = () => abortController.abort();

    if (externalSignal?.aborted) {
      abortFromExternalSignal();
    } else {
      externalSignal?.addEventListener("abort", abortFromExternalSignal, {
        once: true,
      });
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        Promise.resolve().then(() =>
          fetchImplementation(input, {
            ...init,
            signal: abortController.signal,
          }),
        ),
        new Promise<Response>((_resolve, reject) => {
          timeoutId = globalThis.setTimeout(() => {
            abortController.abort();
            reject(new SupabaseRequestTimeoutError());
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }

      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    }
  };
}

function readPositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}
