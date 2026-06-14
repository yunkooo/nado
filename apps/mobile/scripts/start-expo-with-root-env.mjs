import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..");
const rootEnvPath = resolve(repoRoot, ".env");

const env = {
  ...process.env,
  DEVELOPER_DIR:
    process.env.DEVELOPER_DIR ?? "/Applications/Xcode.app/Contents/Developer",
  ...readPublicExpoEnv(rootEnvPath),
};
const expoArgs = process.argv.slice(2).filter((arg, index) => {
  return !(index === 0 && arg === "--");
});
const mobileRuntimePackages = ["@nado/shared", "@nado/tokens"];

buildMobileRuntimePackages();

const child = spawn("pnpm", ["exec", "expo", "start", ...expoArgs], {
  cwd: appRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function readPublicExpoEnv(path) {
  let content;

  try {
    content = readFileSync(path, "utf8");
  } catch {
    return {};
  }

  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map(parseEnvLine)
      .filter(Boolean)
      .filter(([key]) => key.startsWith("EXPO_PUBLIC_")),
  );
}

function buildMobileRuntimePackages() {
  for (const packageName of mobileRuntimePackages) {
    const result = spawnSync("pnpm", ["--filter", packageName, "build"], {
      cwd: repoRoot,
      env,
      stdio: "inherit",
    });

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

function parseEnvLine(line) {
  const equalsIndex = line.indexOf("=");

  if (equalsIndex === -1) {
    return null;
  }

  const key = line.slice(0, equalsIndex).trim();
  const value = stripQuotes(line.slice(equalsIndex + 1).trim());

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return [key, value];
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
