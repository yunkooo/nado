import { describe, expect, it } from "vitest";
import nextConfig, { resolveApiBaseUrl } from "../../next.config.mjs";

describe("nextConfig", () => {
  it("uses the local API during development when env is missing", () => {
    expect(resolveApiBaseUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:4000",
    );
  });

  it("fails fast when the production API env is missing", () => {
    expect(() => resolveApiBaseUrl({ NODE_ENV: "production" })).toThrow(
      "NADO_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is required in production.",
    );
  });

  it("allows an explicit API base URL override", () => {
    expect(
      resolveApiBaseUrl({
        NADO_API_BASE_URL: "http://localhost:4000",
      }),
    ).toBe("http://localhost:4000");
  });

  it("uses the public API URL when the server override is blank", () => {
    expect(
      resolveApiBaseUrl({
        NADO_API_BASE_URL: "   ",
        NEXT_PUBLIC_API_BASE_URL: " https://api.example.com/ ",
        NODE_ENV: "production",
      }),
    ).toBe("https://api.example.com/");
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
      "@nado/shared/analysis": "../../packages/shared/src/analysisContracts.ts",
      "@nado/shared/analysis-input":
        "../../packages/shared/src/analysisInput.ts",
      "@nado/shared/analysis-presentation":
        "../../packages/shared/src/analysisPresentation.ts",
      "@nado/shared/analysis-state":
        "../../packages/shared/src/analysisState.ts",
      "@nado/shared/api-errors": "../../packages/shared/src/apiErrors.ts",
      "@nado/shared/http": "../../packages/shared/src/http.ts",
      "@nado/shared/review": "../../packages/shared/src/reviewSession.ts",
      "@nado/shared/user-scope": "../../packages/shared/src/userScope.ts",
      "@nado/shared/vocabulary":
        "../../packages/shared/src/vocabularyContracts.ts",
      "@nado/shared/vocabulary-pagination":
        "../../packages/shared/src/vocabularyPagination.ts",
      "@nado/shared/vocabulary-realtime":
        "../../packages/shared/src/vocabularyRealtime.ts",
      "@nado/shared/vocabulary-state":
        "../../packages/shared/src/vocabularyState.ts",
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
