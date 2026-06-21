import { describe, expect, it, vi } from "vitest";

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
  Linking: { openURL: vi.fn() },
  Platform: { OS: "web" },
}));

import { createMobileSupabaseAuthOptions } from "./authClient";

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
