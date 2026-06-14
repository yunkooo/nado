import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const apiBaseUrl = process.env.NADO_E2E_API_BASE_URL ?? "http://127.0.0.1:4000";
const webBaseUrl = process.env.NADO_E2E_WEB_BASE_URL ?? "http://127.0.0.1:3000";
const isCi = Boolean(process.env.CI);

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @nado/api dev",
      cwd: repoRoot,
      env: {
        NADO_ANONYMOUS_DAILY_ANALYSIS_LIMIT: "0",
        NADO_API_PORT: "4000",
        NADO_AUTHENTICATED_DAILY_ANALYSIS_LIMIT: "0",
        NADO_USAGE_IP_HASH_SALT: "nado-e2e",
        OPENAI_API_KEY: "nado-e2e-openai-key",
        SUPABASE_ANON_KEY: "nado-e2e-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "nado-e2e-service-role-key",
        SUPABASE_URL: "http://127.0.0.1:54321",
      },
      reuseExistingServer: !isCi,
      timeout: 30_000,
      url: `${apiBaseUrl}/health`,
    },
    {
      command:
        "pnpm --filter @nado/web exec next dev --hostname 127.0.0.1 --port 3000",
      cwd: repoRoot,
      env: {
        NADO_API_BASE_URL: apiBaseUrl,
        NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "nado-e2e-anon-key",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      },
      reuseExistingServer: !isCi,
      timeout: 60_000,
      url: webBaseUrl,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
