import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export type LoadRootEnvOptions = {
  envPath?: string;
  exists?: (path: string) => boolean;
  loadEnvFile?: (path: string) => void;
};

const defaultRootEnvPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
  ".env",
);

export function loadRootEnv(options: LoadRootEnvOptions = {}): boolean {
  const envPath = options.envPath ?? defaultRootEnvPath;
  const exists = options.exists ?? existsSync;

  if (!exists(envPath)) {
    return false;
  }

  const loadEnvFile = options.loadEnvFile ?? process.loadEnvFile;
  loadEnvFile(envPath);

  return true;
}
