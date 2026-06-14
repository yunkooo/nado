import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnvPath = join(root, ".env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveApiBaseUrl(env = process.env) {
  return (
    env.NADO_API_BASE_URL ??
    env.NEXT_PUBLIC_API_BASE_URL ??
    "https://nadoapi-production.up.railway.app"
  );
}

const apiBaseUrl = resolveApiBaseUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        destination: `${apiBaseUrl}/api/:path*`,
        source: "/api/:path*",
      },
    ];
  },
  turbopack: {
    root,
    resolveAlias: {
      "@nado/shared": "../../packages/shared/src/index.ts",
      "@nado/tokens": "../../packages/tokens/src/index.ts",
      "@nado/tokens/react-native": "../../packages/tokens/src/reactNative.ts",
      "@nado/ui": "../../packages/ui/src/index.ts",
      "@nado/ui/styles.css": "../../packages/ui/src/styles.css",
    },
  },
  transpilePackages: ["@nado/shared", "@nado/tokens", "@nado/ui"],
};

export default nextConfig;
