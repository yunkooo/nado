import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseAuthConfig = {
  anonKey: string | undefined;
  url: string | undefined;
};

let browserClient: SupabaseClient | null = null;

type BrowserAuthCallbackClient = {
  auth: {
    setSession(session: {
      access_token: string;
      refresh_token: string;
    }): Promise<{ error: unknown }>;
  };
};

type BrowserHistoryLike = {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
};

export type BrowserAuthCallbackResult = "handled" | "ignored" | "error";

export function getSupabaseAuthConfig(): SupabaseAuthConfig {
  return {
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function isSupabaseAuthConfigured(config: SupabaseAuthConfig): boolean {
  return isConcreteValue(config.url) && isConcreteValue(config.anonKey);
}

export function createGoogleOAuthRedirectTo(currentHref: string): string {
  return new URL(currentHref).origin;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseAuthConfig();
  const { anonKey, url } = config;

  if (!isConcreteValue(url) || !isConcreteValue(anonKey)) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();

  return data.session?.access_token ?? null;
}

export async function completeAuthFromCurrentUrl(
  url: URL = new URL(window.location.href),
  client: BrowserAuthCallbackClient | null = getSupabaseBrowserClient(),
  history: BrowserHistoryLike = window.history,
): Promise<BrowserAuthCallbackResult> {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  if (hashParams.has("error") || hashParams.has("error_code")) {
    removeAuthHashFromUrl(url, history);
    return "error";
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken || !refreshToken || !client) {
    return "ignored";
  }

  removeAuthHashFromUrl(url, history);

  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return error ? "error" : "handled";
}

function removeAuthHashFromUrl(url: URL, history: BrowserHistoryLike) {
  const cleanUrl = new URL(url.href);
  cleanUrl.hash = "";
  history.replaceState(null, "", cleanUrl.toString());
}

function isConcreteValue(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("replace-with-"));
}
