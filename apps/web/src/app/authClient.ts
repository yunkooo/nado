import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseAuthConfig = {
  anonKey: string | undefined;
  url: string | undefined;
};

let browserClient: SupabaseClient | null = null;

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
        detectSessionInUrl: true,
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

function isConcreteValue(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("replace-with-"));
}
