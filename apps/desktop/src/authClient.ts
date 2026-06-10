import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isTauri as isTauriApiRuntime } from "@tauri-apps/api/core";

export type SupabaseAuthConfig = {
  anonKey: string | undefined;
  url: string | undefined;
};

let browserClient: SupabaseClient | null = null;
export const NADO_DESKTOP_AUTH_CALLBACK_URL = "nado://auth/callback";
export const NADO_DESKTOP_OAUTH_REDIRECT_URL = "http://127.0.0.1:17654";

type OAuthRedirectOptions = {
  desktopRedirectUrl?: string;
  isTauri?: boolean;
};

type AuthCallbackClient = {
  auth: {
    exchangeCodeForSession(authCode: string): Promise<{ error: unknown }>;
    setSession(session: {
      access_token: string;
      refresh_token: string;
    }): Promise<{ error: unknown }>;
  };
};

export type AuthCallbackResult = "handled" | "ignored" | "error";

export function getSupabaseAuthConfig(): SupabaseAuthConfig {
  return {
    anonKey:
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
      (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined),
    url:
      (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
      (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined),
  };
}

export function isSupabaseAuthConfigured(config: SupabaseAuthConfig): boolean {
  return isConcreteValue(config.url) && isConcreteValue(config.anonKey);
}

export function createGoogleOAuthRedirectTo(
  currentHref: string,
  options: OAuthRedirectOptions = {},
): string {
  if (options.isTauri ?? isTauriRuntime()) {
    return (
      options.desktopRedirectUrl ??
      (import.meta.env.VITE_DESKTOP_AUTH_REDIRECT_URL as string | undefined) ??
      NADO_DESKTOP_OAUTH_REDIRECT_URL
    );
  }

  return new URL(currentHref).origin;
}

export function createSupabaseAuthOptions(options: { isTauri?: boolean } = {}) {
  const isDesktop = options.isTauri ?? isTauriRuntime();

  return {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: !isDesktop,
      flowType: isDesktop ? ("pkce" as const) : ("implicit" as const),
      persistSession: true,
    },
  };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseAuthConfig();
  const { anonKey, url } = config;

  if (!isConcreteValue(url) || !isConcreteValue(anonKey)) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey, createSupabaseAuthOptions());
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

export function getAuthCallbackUrlKind(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "nado:" && parsed.hostname === "auth") {
      return parsed.pathname === "/callback"
        ? "desktop-callback"
        : "unsupported";
    }

    return "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function completeAuthFromCallbackUrl(
  url: string,
  client: AuthCallbackClient | null = getSupabaseBrowserClient(),
): Promise<AuthCallbackResult> {
  if (getAuthCallbackUrlKind(url) !== "desktop-callback" || !client) {
    return "ignored";
  }

  const parsed = new URL(url);

  if (
    parsed.searchParams.has("error") ||
    parsed.searchParams.has("error_code")
  ) {
    return "error";
  }

  const code = parsed.searchParams.get("code");

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    return error ? "error" : "handled";
  }

  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return "ignored";
  }

  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return error ? "error" : "handled";
}

export function isTauriRuntime() {
  return (
    isTauriApiRuntime() ||
    (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)
  );
}

function isConcreteValue(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("replace-with-"));
}
