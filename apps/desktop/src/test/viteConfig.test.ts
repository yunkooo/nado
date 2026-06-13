import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const viteConfigSource = readFileSync(
  new URL("../../vite.config.ts", import.meta.url),
  "utf8",
);

describe("desktop Vite config", () => {
  it("loads environment variables from the repository root", () => {
    expect(viteConfigSource).toContain('envDir: "../.."');
    expect(viteConfigSource).toContain("NEXT_PUBLIC_");
  });

  it("proxies API calls to the configured backend during local development", () => {
    expect(viteConfigSource).toContain("loadEnv");
    expect(viteConfigSource).toContain("VITE_API_BASE_URL");
    expect(viteConfigSource).toContain('"/api"');
    expect(viteConfigSource).toContain("changeOrigin: true");
  });

  it("resolves workspace packages from source during desktop bundling", () => {
    expect(viteConfigSource).toContain("../../packages/shared/src/index.ts");
    expect(viteConfigSource).toContain("../../packages/tokens/src/index.ts");
    expect(viteConfigSource).toContain(
      "../../packages/tokens/src/reactNative.ts",
    );
    expect(viteConfigSource).toContain("../../packages/ui/src/index.ts");
    expect(viteConfigSource).toContain("../../packages/ui/src/styles.css");
  });
});
