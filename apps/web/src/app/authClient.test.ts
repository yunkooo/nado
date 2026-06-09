import { describe, expect, it } from "vitest";
import {
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
});
