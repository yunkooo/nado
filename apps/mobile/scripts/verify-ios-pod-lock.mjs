import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iosRoot = resolve(appRoot, "ios");
const lockSource = readFileSync(resolve(iosRoot, "Podfile.lock"), "utf8");
const expectedPods = new Map();

const expoModules = runJson([
  "exec",
  "expo-modules-autolinking",
  "resolve",
  "--platform",
  "apple",
  "--json",
]);

for (const module of expoModules.modules ?? []) {
  for (const pod of module.pods ?? []) {
    expectedPods.set(pod.podName, module.packageVersion);
  }
}

const reactNativeConfig = runJson([
  "exec",
  "expo-modules-autolinking",
  "react-native-config",
  "--platform",
  "ios",
  "--json",
]);

for (const dependency of Object.values(reactNativeConfig.dependencies ?? {})) {
  const iosConfig = dependency.platforms?.ios;

  if (!iosConfig?.podspecPath || !iosConfig.version) {
    continue;
  }

  const podspecSource = readFileSync(iosConfig.podspecPath, "utf8");
  const podName = podspecSource.match(
    /\b\w+\.name\s*=\s*["']([^"']+)["']/,
  )?.[1];

  if (!podName) {
    throw new Error(`Could not read pod name from ${iosConfig.podspecPath}.`);
  }

  expectedPods.set(podName, iosConfig.version);
}

const failures = [];

for (const [podName, version] of expectedPods) {
  const podPattern = new RegExp(
    `^  - ${escapeRegExp(podName)}(?:/[^\\s]+)? \\(${escapeRegExp(version)}\\)(?::|$)`,
    "m",
  );

  if (!podPattern.test(lockSource)) {
    failures.push(`${podName} ${version} is missing from Podfile.lock.`);
  }
}

for (const match of lockSource.matchAll(
  /^\s+:(?:path|podspec): "([^"]*node_modules\/[^"]+)"$/gm,
)) {
  const dependencyPath = resolve(iosRoot, match[1]);

  if (!existsSync(dependencyPath)) {
    failures.push(`Podfile.lock references a missing path: ${match[1]}`);
  }
}

if (failures.length > 0) {
  throw new Error(`iOS Pod lock is stale:\n- ${failures.join("\n- ")}`);
}

console.log(
  `iOS Pod lock verification passed for ${expectedPods.size} autolinked pods.`,
);

function runJson(args) {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(executable, args, {
    cwd: appRoot,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return JSON.parse(result.stdout);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
