import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const toPathname = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? env.VITE_NADO_API_BASE_URL;

  return {
    envDir: "../..",
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: /^@nado\/shared$/,
          replacement: toPathname("../../packages/shared/src/index.ts"),
        },
        {
          find: /^@nado\/ui$/,
          replacement: toPathname("../../packages/ui/src/index.ts"),
        },
        {
          find: /^@nado\/ui\/styles.css$/,
          replacement: toPathname("../../packages/ui/src/styles.css"),
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
