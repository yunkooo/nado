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
const defaultCapability = JSON.parse(
  readFileSync(
    new URL("../src-tauri/capabilities/default.json", import.meta.url),
    "utf8",
  ),
) as {
  permissions?: Array<
    | string
    | {
        allow?: Array<{ url: string }>;
        identifier?: string;
      }
  >;
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

  it("allows the Tauri HTTP plugin only for the configured API origins", () => {
    expect(defaultCapability.permissions).toContain("core:default");

    const httpPermission = defaultCapability.permissions?.find(
      (permission) =>
        typeof permission === "object" &&
        permission.identifier === "http:default",
    );

    expect(httpPermission).toMatchObject({
      allow: expect.arrayContaining([
        { url: "https://nadoapi-production.up.railway.app" },
        { url: "https://nadoapi-production.up.railway.app/*" },
      ]),
      identifier: "http:default",
    });
  });
});
