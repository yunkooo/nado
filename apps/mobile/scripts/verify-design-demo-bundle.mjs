import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..");
const outputRoot = mkdtempSync(join(tmpdir(), "nado-mobile-design-bundle-"));
const mobileRuntimePackages = [
  "@nado/shared",
  "@nado/tokens",
  "@nado/ui-native",
  "@nado/ui",
];
const platforms = ["ios", "android"];
const variants = [
  { appVariant: "production", expectsDemoMarker: false },
  { appVariant: "design-demo", expectsDemoMarker: true },
];
const bundleMarker = "NADO_MOBILE_DESIGN_DEMO_BUNDLE_MARKER";

try {
  for (const packageName of mobileRuntimePackages) {
    run("pnpm", ["--filter", packageName, "build"], repoRoot, process.env);
  }

  for (const platform of platforms) {
    for (const variant of variants) {
      const outputDir = join(outputRoot, platform, variant.appVariant);

      run(
        "pnpm",
        [
          "exec",
          "expo",
          "export",
          "--platform",
          platform,
          "--output-dir",
          outputDir,
          "--no-bytecode",
        ],
        appRoot,
        {
          ...process.env,
          NADO_MOBILE_APP_VARIANT: variant.appVariant,
        },
      );

      const bundleSource = readJavaScriptBundles(outputDir);
      const hasDemoMarker = bundleSource.includes(bundleMarker);

      if (hasDemoMarker !== variant.expectsDemoMarker) {
        throw new Error(
          `${platform} ${variant.appVariant} bundle marker expectation failed.`,
        );
      }
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(outputRoot, { force: true, recursive: true });
}

function readJavaScriptBundles(directory) {
  let source = "";

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      source += readJavaScriptBundles(entryPath);
    } else if (entry.name.endsWith(".js")) {
      source += readFileSync(entryPath, "utf8");
    }
  }

  return source;
}

function run(command, args, cwd, env) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status ?? 1}.`,
    );
  }
}
