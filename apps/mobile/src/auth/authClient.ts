import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  processLock,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { AppState, Linking, Platform, type AppStateStatus } from "react-native";

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
type MobilePlatformOS = typeof Platform.OS;

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

type MobileAuthRefreshClient = {
  auth: {
    startAutoRefresh(): Promise<void> | void;
    stopAutoRefresh(): Promise<void> | void;
  };
};

type MobileAppState = {
  addEventListener(
    event: "change",
    listener: (state: AppStateStatus) => void,
  ): { remove(): void };
  currentState: AppStateStatus;
};

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
    mobileSupabaseClient = createClient(
      url,
      anonKey,
      createMobileSupabaseAuthOptions(),
    );
    void startMobileAuthAutoRefreshLifecycle(mobileSupabaseClient);
  }

  return mobileSupabaseClient;
}

export function startMobileAuthAutoRefreshLifecycle(
  client: MobileAuthRefreshClient,
  {
    appState = AppState,
    platformOS = Platform.OS,
  }: {
    appState?: MobileAppState;
    platformOS?: MobilePlatformOS;
  } = {},
) {
  if (platformOS === "web") {
    return () => undefined;
  }

  const syncAutoRefresh = (state: AppStateStatus) => {
    const refreshTask =
      state === "active"
        ? client.auth.startAutoRefresh()
        : client.auth.stopAutoRefresh();
    void Promise.resolve(refreshTask).catch(() => undefined);
  };

  syncAutoRefresh(appState.currentState);
  const subscription = appState.addEventListener("change", syncAutoRefresh);

  return () => {
    subscription.remove();
    void Promise.resolve(client.auth.stopAutoRefresh()).catch(() => undefined);
  };
}

export function createMobileSupabaseAuthOptions({
  platformOS = Platform.OS,
}: {
  platformOS?: MobilePlatformOS;
} = {}) {
  return {
    auth: {
      ...(platformOS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      detectSessionInUrl: platformOS === "web",
      lock: processLock,
      persistSession: true,
    },
  };
}

export async function signInWithGoogle() {
  const supabase = getMobileSupabaseClient();

  if (!supabase) {
    return {
      message: MOBILE_AUTH_CONFIGURATION_ERROR_MESSAGE,
      status: "error" as const,
    };
  }

  try {
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
      await Linking.openURL(data.url);
    }

    return { status: "success" as const };
  } catch {
    return {
      message: MOBILE_AUTH_ERROR_MESSAGE,
      status: "error" as const,
    };
  }
}

export async function signOut() {
  const supabase = getMobileSupabaseClient();

  if (!supabase) {
    return {
      message: MOBILE_AUTH_CONFIGURATION_ERROR_MESSAGE,
      status: "error" as const,
    };
  }

  try {
    const { error } = await supabase.auth.signOut();

    return error
      ? { message: MOBILE_AUTH_ERROR_MESSAGE, status: "error" as const }
      : { status: "success" as const };
  } catch {
    return {
      message: MOBILE_AUTH_ERROR_MESSAGE,
      status: "error" as const,
    };
  }
}

export function toMobileAuthSnapshot(session: Session | null) {
  if (!session) {
    return {
      accessToken: null,
      message: null,
      session,
      status: "anonymous" as const,
    };
  }

  return {
    accessToken: session.access_token,
    message: null,
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
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const callbackError =
    parsed.searchParams.get("error") ??
    parsed.searchParams.get("error_code") ??
    parsed.searchParams.get("error_description") ??
    hashParams.get("error") ??
    hashParams.get("error_code") ??
    hashParams.get("error_description");

  if (callbackError) {
    return "error";
  }

  const code = parsed.searchParams.get("code");

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    return error ? "error" : "handled";
  }

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
