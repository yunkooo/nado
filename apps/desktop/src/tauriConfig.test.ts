import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tauriConfig = JSON.parse(
  readFileSync(
    new URL("../src-tauri/tauri.conf.json", import.meta.url),
    "utf8",
  ),
) as {
  app?: {
    security?: {
      csp?: string | null;
    };
  };
};

describe("desktop Tauri config", () => {
  it("uses an explicit content security policy for the desktop shell", () => {
    const csp = tauriConfig.app?.security?.csp;

    expect(csp).toEqual(expect.any(String));
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("https://nadoapi-production.up.railway.app");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
