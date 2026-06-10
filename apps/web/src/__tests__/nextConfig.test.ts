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
});
