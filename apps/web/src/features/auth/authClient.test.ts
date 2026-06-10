import { describe, expect, it, vi } from "vitest";
import {
  completeAuthFromCurrentUrl,
  createGoogleOAuthRedirectTo,
  isSupabaseAuthConfigured,
} from "./authClient";

describe("authClient", () => {
  it("requires a public Supabase URL and anon key", () => {
    expect(
      isSupabaseAuthConfigured({
        anonKey: "replace-with-local-anon-key-from-supabase-status",
        url: "http://127.0.0.1:54321",
      }),
    ).toBe(false);
    expect(
      isSupabaseAuthConfigured({
        anonKey: "sb_publishable_example",
        url: "http://127.0.0.1:54321",
      }),
    ).toBe(true);
  });

  it("uses the current origin as the Google OAuth redirect target", () => {
    expect(
      createGoogleOAuthRedirectTo("http://localhost:3000/vocabulary?tab=saved"),
    ).toBe("http://localhost:3000");
  });

  it("stores OAuth hash tokens and removes them from the visible URL", async () => {
    const setSession = vi.fn(async () => ({ error: null }));
    const replaceState = vi.fn();

    const result = await completeAuthFromCurrentUrl(
      new URL(
        "https://nado-web.vercel.app/vocabulary#access_token=access&refresh_token=refresh&token_type=bearer",
      ),
      {
        auth: {
          setSession,
        },
      },
      {
        replaceState,
      },
    );

    expect(result).toBe("handled");
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "https://nado-web.vercel.app/vocabulary",
    );
  });
});
