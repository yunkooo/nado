import { describe, expect, it } from "vitest";
import nextConfig, { resolveApiBaseUrl } from "../../next.config.mjs";

describe("nextConfig", () => {
  it("uses the deployed Railway API as the safe fallback when env is missing", () => {
    expect(resolveApiBaseUrl({})).toBe(
      "https://nadoapi-production.up.railway.app",
    );
  });

  it("allows an explicit API base URL override", () => {
    expect(
      resolveApiBaseUrl({
        NADO_API_BASE_URL: "http://localhost:4000",
      }),
    ).toBe("http://localhost:4000");
  });

  it("proxies API requests to the configured API server", async () => {
    const apiBaseUrl = resolveApiBaseUrl();

    await expect(nextConfig.rewrites?.()).resolves.toEqual([
      {
        destination: `${apiBaseUrl}/api/:path*`,
        source: "/api/:path*",
      },
    ]);
  });

  it("transpiles workspace packages that are consumed from source", () => {
    expect(nextConfig.transpilePackages).toEqual(
      expect.arrayContaining([
        "@nado/shared",
        "@nado/tokens",
        "@nado/ui",
        "@nado/ui-web",
      ]),
    );
  });

  it("resolves workspace packages from source during web bundling", () => {
    expect(nextConfig.turbopack?.resolveAlias).toMatchObject({
      "@nado/shared": "../../packages/shared/src/index.ts",
      "@nado/tokens": "../../packages/tokens/src/index.ts",
      "@nado/tokens/react-native": "../../packages/tokens/src/reactNative.ts",
      "@nado/ui": "../../packages/ui/src/index.ts",
      "@nado/ui/styles.css": "../../packages/ui/src/styles.css",
      "@nado/ui/web/styles.css": "../../packages/ui/src/styles.css",
      "@nado/ui-web": "../../packages/ui-web/src/index.ts",
      "@nado/ui-web/styles.css": "../../packages/ui-web/src/styles.css",
    });
  });
});
