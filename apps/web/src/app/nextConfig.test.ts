import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.mjs";

describe("nextConfig", () => {
  it("proxies API requests to the nado API server", async () => {
    await expect(nextConfig.rewrites?.()).resolves.toEqual([
      {
        destination: "http://localhost:4000/api/:path*",
        source: "/api/:path*",
      },
    ]);
  });
});
