import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? env.VITE_NADO_API_BASE_URL;

  return {
    envDir: "../..",
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
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
