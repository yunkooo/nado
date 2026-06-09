import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnvPath = join(root, ".env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const apiBaseUrl = process.env.NADO_API_BASE_URL ?? "http://localhost:4000";

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
  },
  transpilePackages: ["@nado/shared", "@nado/ui"],
};

export default nextConfig;
