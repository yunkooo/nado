import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  processLock,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { Linking, Platform } from "react-native";

type MobileAuthProcessEnv = {
  EXPO_PUBLIC_MOBILE_AUTH_REDIRECT_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  EXPO_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

declare const process: { env: MobileAuthProcessEnv };

export type MobileAuthConfig = {
  anonKey: string | undefined;
  url: string | undefined;
};

let mobileSupabaseClient: SupabaseClient | null = null;
export const NADO_MOBILE_AUTH_CALLBACK_URL = "nado://auth/callback";

type MobileAuthCallbackClient = {
  auth: {
    exchangeCodeForSession(authCode: string): Promise<{ error: unknown }>;
    setSession(session: {
      access_token: string;
      refresh_token: string;
    }): Promise<{ error: unknown }>;
  };
};

export type MobileAuthCallbackResult = "handled" | "ignored" | "error";
export type MobileAuthActionResult =
  | { status: "success" }
  | { message: string; status: "error" };

const MOBILE_AUTH_CONFIGURATION_ERROR_MESSAGE =
  "로그인 설정이 완료되지 않았어요. Supabase 환경변수를 확인해 주세요.";
const MOBILE_AUTH_ERROR_MESSAGE =
  "Google 로그인 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";

export function getMobileSupabaseAuthConfig(): MobileAuthConfig {
  return {
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      readNextPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    url:
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      readNextPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  };
}

export function isMobileSupabaseAuthConfigured(
  config: MobileAuthConfig = getMobileSupabaseAuthConfig(),
): config is { anonKey: string; url: string } {
  return isConcreteValue(config.url) && isConcreteValue(config.anonKey);
}

export function getMobileSupabaseClient(): SupabaseClient | null {
  const config = getMobileSupabaseAuthConfig();

  if (!isMobileSupabaseAuthConfigured(config)) {
    return null;
  }

  const { anonKey, url } = config;

  if (!mobileSupabaseClient) {
    mobileSupabaseClient = createClient(url, anonKey, {
      auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
        persistSession: true,
      },
    });
  }

  return mobileSupabaseClient;
}

export async function signInWithGoogle() {
  const supabase = getMobileSupabaseClient();

  if (!supabase) {
    return {
      message: MOBILE_AUTH_CONFIGURATION_ERROR_MESSAGE,
      status: "error" as const,
    };
  }

  const redirectTo = createMobileOAuthRedirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
    provider: "google",
  });

  if (error) {
    return {
      message: MOBILE_AUTH_ERROR_MESSAGE,
      status: "error" as const,
    };
  }

  if (Platform.OS !== "web" && data.url) {
    try {
      await Linking.openURL(data.url);
    } catch {
      return {
        message: MOBILE_AUTH_ERROR_MESSAGE,
        status: "error" as const,
      };
    }
  }

  return { status: "success" as const };
}

export async function signOut() {
  const supabase = getMobileSupabaseClient();

  if (!supabase) {
    return {
      message: MOBILE_AUTH_CONFIGURATION_ERROR_MESSAGE,
      status: "error" as const,
    };
  }

  const { error } = await supabase.auth.signOut();

  return error
    ? { message: MOBILE_AUTH_ERROR_MESSAGE, status: "error" as const }
    : { status: "success" as const };
}

export function toMobileAuthSnapshot(session: Session | null) {
  if (!session) {
    return {
      accessToken: null,
      session,
      status: "anonymous" as const,
    };
  }

  return {
    accessToken: session.access_token,
    session,
    status: "authenticated" as const,
  };
}

export function createMobileOAuthRedirectTo() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.EXPO_PUBLIC_MOBILE_AUTH_REDIRECT_URL ??
    NADO_MOBILE_AUTH_CALLBACK_URL
  );
}

export function getMobileAuthCallbackUrlKind(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "nado:" && parsed.hostname === "auth") {
      return parsed.pathname === "/callback"
        ? "mobile-callback"
        : "unsupported";
    }

    return "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function completeMobileAuthFromCallbackUrl(
  url: string,
  client: MobileAuthCallbackClient | null = getMobileSupabaseClient(),
): Promise<MobileAuthCallbackResult> {
  if (getMobileAuthCallbackUrlKind(url) !== "mobile-callback" || !client) {
    return "ignored";
  }

  const parsed = new URL(url);
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

function isConcreteValue(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("replace-with-"));
}

function readNextPublicEnv(key: keyof MobileAuthProcessEnv) {
  return typeof process === "undefined" ? undefined : process.env[key];
}
