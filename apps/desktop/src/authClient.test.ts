import { describe, expect, it, vi } from "vitest";
import {
  completeAuthFromCallbackUrl,
  createSupabaseAuthOptions,
  createGoogleOAuthRedirectTo,
  getAuthCallbackUrlKind,
  isTauriRuntime,
  NADO_DESKTOP_AUTH_CALLBACK_URL,
  NADO_DESKTOP_OAUTH_REDIRECT_URL,
} from "./authClient";

describe("desktop auth client helpers", () => {
  it("uses the current origin for browser-based development OAuth redirects", () => {
    expect(
      createGoogleOAuthRedirectTo(
        "http://localhost:5174/vocabulary?tab=saved",
        {
          isTauri: false,
        },
      ),
    ).toBe("http://localhost:5174");
  });

  it("uses a desktop loopback callback for packaged Tauri OAuth redirects", () => {
    expect(
      createGoogleOAuthRedirectTo("tauri://localhost", {
        isTauri: true,
      }),
    ).toBe(NADO_DESKTOP_OAUTH_REDIRECT_URL);
  });

  it("keeps Supabase URL session detection for browser dev only", () => {
    expect(createSupabaseAuthOptions({ isTauri: false }).auth).toMatchObject({
      detectSessionInUrl: true,
    });
    expect(createSupabaseAuthOptions({ isTauri: true }).auth).toMatchObject({
      detectSessionInUrl: false,
    });
  });

  it("detects the Tauri runtime from the official global flag", () => {
    const runtimeGlobal = globalThis as typeof globalThis & {
      isTauri?: boolean;
    };
    const originalIsTauri = runtimeGlobal.isTauri;

    runtimeGlobal.isTauri = true;
    expect(isTauriRuntime()).toBe(true);

    runtimeGlobal.isTauri = originalIsTauri;
  });

  it("allows an explicit desktop OAuth redirect override", () => {
    expect(
      createGoogleOAuthRedirectTo("tauri://localhost", {
        desktopRedirectUrl: "nado-dev://auth/callback",
        isTauri: true,
      }),
    ).toBe("nado-dev://auth/callback");
  });

  it("accepts only nado auth callback URLs as desktop OAuth callbacks", () => {
    expect(getAuthCallbackUrlKind("nado://auth/callback?code=abc")).toBe(
      "desktop-callback",
    );
    expect(getAuthCallbackUrlKind("nado://other/callback?code=abc")).toBe(
      "unsupported",
    );
    expect(getAuthCallbackUrlKind("https://example.com/auth/callback")).toBe(
      "unsupported",
    );
  });

  it("exchanges auth codes from desktop OAuth callbacks", async () => {
    const exchangeCodeForSession = vi.fn(async () => ({ error: null }));

    const result = await completeAuthFromCallbackUrl(
      "nado://auth/callback?code=abc",
      {
        auth: {
          exchangeCodeForSession,
          setSession: vi.fn(),
        },
      },
    );

    expect(result).toBe("handled");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("sets a session from hash-based desktop OAuth callbacks", async () => {
    const setSession = vi.fn(async () => ({ error: null }));

    const result = await completeAuthFromCallbackUrl(
      "nado://auth/callback#access_token=access&refresh_token=refresh",
      {
        auth: {
          exchangeCodeForSession: vi.fn(),
          setSession,
        },
      },
    );

    expect(result).toBe("handled");
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("reports OAuth callback errors instead of ignoring them", async () => {
    const result = await completeAuthFromCallbackUrl(
      "nado://auth/callback?error=invalid_request&error_code=bad_oauth_state",
      {
        auth: {
          exchangeCodeForSession: vi.fn(),
          setSession: vi.fn(),
        },
      },
    );

    expect(result).toBe("error");
  });
});
