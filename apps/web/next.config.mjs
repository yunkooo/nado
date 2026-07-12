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
  const configuredApiBaseUrl =
    env.NADO_API_BASE_URL?.trim() || env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "NADO_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is required in production.",
    );
  }

  return "http://localhost:4000";
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
    },
  },
  transpilePackages: [
    "@nado/shared",
    "@nado/tokens",
    "@nado/ui",
    "@nado/ui-web",
  ],
};

export default nextConfig;
