import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const toPathname = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export function resolveDesktopVendorChunk(moduleId: string) {
  if (moduleId.includes("/node_modules/@supabase/")) {
    return "vendor-supabase";
  }

  if (
    moduleId.includes("/node_modules/react/") ||
    moduleId.includes("/node_modules/react-dom/") ||
    moduleId.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (moduleId.includes("/node_modules/@tauri-apps/")) {
    return "vendor-tauri";
  }

  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? env.VITE_NADO_API_BASE_URL;

  return {
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: resolveDesktopVendorChunk,
        },
      },
    },
    envDir: "../..",
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: /^@nado\/shared\/analysis$/,
          replacement: toPathname(
            "../../packages/shared/src/analysisContracts.ts",
          ),
        },
        {
          find: /^@nado\/shared\/analysis-input$/,
          replacement: toPathname("../../packages/shared/src/analysisInput.ts"),
        },
        {
          find: /^@nado\/shared\/analysis-presentation$/,
          replacement: toPathname(
            "../../packages/shared/src/analysisPresentation.ts",
          ),
        },
        {
          find: /^@nado\/shared\/analysis-state$/,
          replacement: toPathname("../../packages/shared/src/analysisState.ts"),
        },
        {
          find: /^@nado\/shared\/api-errors$/,
          replacement: toPathname("../../packages/shared/src/apiErrors.ts"),
        },
        {
          find: /^@nado\/shared\/http$/,
          replacement: toPathname("../../packages/shared/src/http.ts"),
        },
        {
          find: /^@nado\/shared\/review$/,
          replacement: toPathname("../../packages/shared/src/reviewSession.ts"),
        },
        {
          find: /^@nado\/shared\/user-scope$/,
          replacement: toPathname("../../packages/shared/src/userScope.ts"),
        },
        {
          find: /^@nado\/shared\/vocabulary$/,
          replacement: toPathname(
            "../../packages/shared/src/vocabularyContracts.ts",
          ),
        },
        {
          find: /^@nado\/shared\/vocabulary-pagination$/,
          replacement: toPathname(
            "../../packages/shared/src/vocabularyPagination.ts",
          ),
        },
        {
          find: /^@nado\/shared\/vocabulary-realtime$/,
          replacement: toPathname(
            "../../packages/shared/src/vocabularyRealtime.ts",
          ),
        },
        {
          find: /^@nado\/shared\/vocabulary-state$/,
          replacement: toPathname(
            "../../packages/shared/src/vocabularyState.ts",
          ),
        },
        {
          find: /^@nado\/shared$/,
          replacement: toPathname("../../packages/shared/src/index.ts"),
        },
        {
          find: /^@nado\/tokens$/,
          replacement: toPathname("../../packages/tokens/src/index.ts"),
        },
        {
          find: /^@nado\/tokens\/react-native$/,
          replacement: toPathname("../../packages/tokens/src/reactNative.ts"),
        },
        {
          find: /^@nado\/ui$/,
          replacement: toPathname("../../packages/ui/src/index.ts"),
        },
        {
          find: /^@nado\/ui\/styles.css$/,
          replacement: toPathname("../../packages/ui/src/styles.css"),
        },
        {
          find: /^@nado\/ui\/web\/styles.css$/,
          replacement: toPathname("../../packages/ui/src/styles.css"),
        },
        {
          find: /^@nado\/ui-web\/AnalysisResult$/,
          replacement: toPathname(
            "../../packages/ui-web/src/AnalysisResult.tsx",
          ),
        },
        {
          find: /^@nado\/ui-web\/Button$/,
          replacement: toPathname("../../packages/ui-web/src/Button.tsx"),
        },
        {
          find: /^@nado\/ui-web\/InputComposer$/,
          replacement: toPathname(
            "../../packages/ui-web/src/InputComposer.tsx",
          ),
        },
        {
          find: /^@nado\/ui-web\/ReviewSessionView$/,
          replacement: toPathname(
            "../../packages/ui-web/src/ReviewSessionView.tsx",
          ),
        },
        {
          find: /^@nado\/ui-web\/VocabularyItemCard$/,
          replacement: toPathname(
            "../../packages/ui-web/src/VocabularyItemCard.tsx",
          ),
        },
        {
          find: /^@nado\/ui-web\/VocabularyRefreshButton$/,
          replacement: toPathname(
            "../../packages/ui-web/src/VocabularyRefreshButton.tsx",
          ),
        },
        {
          find: /^@nado\/ui-web\/analysisPrimitives$/,
          replacement: toPathname(
            "../../packages/ui-web/src/analysisPrimitives.tsx",
          ),
        },
        {
          find: /^@nado\/ui-web$/,
          replacement: toPathname("../../packages/ui-web/src/index.ts"),
        },
        {
          find: /^@nado\/ui-web\/styles.css$/,
          replacement: toPathname("../../packages/ui-web/src/styles.css"),
        },
      ],
    },
    server: {
      host: "127.0.0.1",
      port: 5174,
      proxy: apiBaseUrl
        ? {
            "/api": {
              changeOrigin: true,
              target: apiBaseUrl,
            },
          }
        : undefined,
      strictPort: true,
    },
  };
});
