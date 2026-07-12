import { describe, expect, it, vi } from "vitest";
import type { AppStateStatus } from "react-native";

const { nativeStorage } = vi.hoisted(() => ({
  nativeStorage: {},
}));

vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: nativeStorage,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
  processLock: "process-lock",
}));
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(),
    currentState: "active",
  },
  Linking: { openURL: vi.fn() },
  Platform: { OS: "web" },
}));

import {
  completeMobileAuthFromCallbackUrl,
  createMobileSupabaseAuthOptions,
  startMobileAuthAutoRefreshLifecycle,
} from "./authClient";

describe("createMobileSupabaseAuthOptions", () => {
  it("lets Supabase consume OAuth callbacks from Expo Web URLs", () => {
    expect(createMobileSupabaseAuthOptions({ platformOS: "web" }).auth).toEqual(
      {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: "process-lock",
        persistSession: true,
      },
    );
  });

  it("keeps native auth callbacks on deep links with AsyncStorage persistence", () => {
    expect(createMobileSupabaseAuthOptions({ platformOS: "ios" }).auth).toEqual(
      {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: "process-lock",
        persistSession: true,
        storage: nativeStorage,
      },
    );
  });
});

describe("startMobileAuthAutoRefreshLifecycle", () => {
  it("runs token refresh only while a native app is active", async () => {
    const startAutoRefresh = vi.fn(() => Promise.resolve());
    const stopAutoRefresh = vi.fn(() => Promise.resolve());
    const remove = vi.fn();
    let handleAppStateChange: (state: AppStateStatus) => void = () => undefined;
    const appState = {
      addEventListener: vi.fn(
        (_event: "change", listener: (state: AppStateStatus) => void) => {
          handleAppStateChange = listener;
          return { remove };
        },
      ),
      currentState: "background" as const,
    };

    const cleanup = startMobileAuthAutoRefreshLifecycle(
      { auth: { startAutoRefresh, stopAutoRefresh } },
      { appState, platformOS: "ios" },
    );

    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
    handleAppStateChange("active");
    expect(startAutoRefresh).toHaveBeenCalledTimes(1);
    handleAppStateChange("background");
    expect(stopAutoRefresh).toHaveBeenCalledTimes(2);

    cleanup();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(stopAutoRefresh).toHaveBeenCalledTimes(3);
  });

  it("leaves browser refresh management to Supabase", () => {
    const addEventListener = vi.fn();
    const startAutoRefresh = vi.fn();
    const stopAutoRefresh = vi.fn();

    startMobileAuthAutoRefreshLifecycle(
      { auth: { startAutoRefresh, stopAutoRefresh } },
      {
        appState: { addEventListener, currentState: "active" },
        platformOS: "web",
      },
    );

    expect(addEventListener).not.toHaveBeenCalled();
    expect(startAutoRefresh).not.toHaveBeenCalled();
    expect(stopAutoRefresh).not.toHaveBeenCalled();
  });
});

describe("completeMobileAuthFromCallbackUrl", () => {
  it("returns an error before exchanging an OAuth callback that contains an error", async () => {
    const exchangeCodeForSession = vi.fn();
    const setSession = vi.fn();

    await expect(
      completeMobileAuthFromCallbackUrl(
        "nado://auth/callback?error=access_denied&error_description=cancelled",
        { auth: { exchangeCodeForSession, setSession } },
      ),
    ).resolves.toBe("error");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });
});
