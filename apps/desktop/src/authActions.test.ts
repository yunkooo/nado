import { describe, expect, it, vi } from "vitest";
import { signOutFromSupabase, startGoogleOAuthSignIn } from "./authActions";

describe("desktop auth actions", () => {
  it("opens the OAuth URL in the system browser for Tauri sign in", async () => {
    const openUrl = vi.fn(async () => undefined);
    const signInWithOAuth = vi.fn(async () => ({
      data: { url: "https://accounts.google.com/oauth" },
      error: null,
    }));

    await expect(
      startGoogleOAuthSignIn({
        currentHref: "tauri://localhost",
        isTauri: true,
        openUrl,
        supabase: {
          auth: {
            signInWithOAuth,
          },
        },
      }),
    ).resolves.toEqual({
      message: "브라우저에서 Google 로그인을 완료해 주세요.",
      status: "message",
    });
    expect(openUrl).toHaveBeenCalledWith("https://accounts.google.com/oauth");
  });

  it("converts thrown OAuth start errors into a visible message", async () => {
    await expect(
      startGoogleOAuthSignIn({
        currentHref: "tauri://localhost",
        isTauri: true,
        openUrl: vi.fn(),
        supabase: {
          auth: {
            signInWithOAuth: vi.fn(async () => {
              throw new Error("storage unavailable");
            }),
          },
        },
      }),
    ).resolves.toEqual({
      message: "Google 로그인을 시작하지 못했어요.",
      status: "error",
    });
  });

  it("converts thrown sign out errors into a visible message", async () => {
    await expect(
      signOutFromSupabase({
        auth: {
          signOut: vi.fn(async () => {
            throw new Error("network unavailable");
          }),
        },
      }),
    ).resolves.toEqual({
      message: "로그아웃하지 못했어요.",
      status: "error",
    });
  });
});
