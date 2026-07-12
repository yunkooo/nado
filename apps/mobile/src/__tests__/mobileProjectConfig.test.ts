import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const tsconfig = JSON.parse(
  readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
);
const expoRunnerSource = readFileSync(
  new URL("../../scripts/run-expo-with-root-env.mjs", import.meta.url),
  "utf8",
);
const indexSource = readFileSync(
  new URL("../../index.ts", import.meta.url),
  "utf8",
);
const metroConfigSource = readFileSync(
  new URL("../../metro.config.js", import.meta.url),
  "utf8",
);

describe("mobile project config", () => {
  it("typechecks every source file instead of only the entry import graph", () => {
    expect(tsconfig.include).toEqual([
      "App.tsx",
      "App.design-demo.tsx",
      "index.ts",
      "src/**/*.ts",
      "src/**/*.tsx",
    ]);
    expect(tsconfig.compilerOptions.types).toEqual(["node", "react"]);
  });

  it("runs semantic lint and keeps formatting as a separate check", () => {
    expect(packageJson.scripts.lint).toContain("eslint");
    expect(packageJson.scripts.lint).toContain('"src/**/*.{ts,tsx}"');
    expect(packageJson.scripts["format:check"]).toContain("prettier --check");
    expect(packageJson.devDependencies.eslint).toBe("9.39.4");
    expect(packageJson.devDependencies["eslint-plugin-react-hooks"]).toBe(
      "7.1.1",
    );
  });

  it("uses one root-env runner for Expo start and native builds", () => {
    expect(
      existsSync(
        new URL("../../scripts/start-expo-with-root-env.mjs", import.meta.url),
      ),
    ).toBe(false);
    expect(
      existsSync(
        new URL("../../scripts/run-ios-with-root-env.mjs", import.meta.url),
      ),
    ).toBe(false);
    expect(packageJson.scripts).toMatchObject({
      android: "node scripts/run-expo-with-root-env.mjs run:android",
      dev: "node scripts/run-expo-with-root-env.mjs start",
      "dev:client":
        "node scripts/run-expo-with-root-env.mjs start --dev-client",
      "dev:design":
        "NADO_MOBILE_APP_VARIANT=design-demo node scripts/run-expo-with-root-env.mjs start",
      ios: "node scripts/run-expo-with-root-env.mjs run:ios",
    });
    expect(expoRunnerSource).toContain(
      'new Set(["run:android", "run:ios", "start"])',
    );
    expect(expoRunnerSource).toContain(
      '["exec", "expo", expoCommand, ...expoArgs]',
    );
  });

  it("loads public root env and builds runtime packages before Expo runs", () => {
    expect(expoRunnerSource).toContain("readPublicExpoEnv(rootEnvPath)");
    expect(expoRunnerSource).toContain('key.startsWith("EXPO_PUBLIC_")');
    expect(expoRunnerSource).toContain("const mobileRuntimePackages = [");
    expect(expoRunnerSource).toContain('"@nado/shared"');
    expect(expoRunnerSource).toContain('"@nado/tokens"');
    expect(expoRunnerSource).toContain('"@nado/ui-native"');
    expect(expoRunnerSource).toContain('"@nado/ui"');
    expect(expoRunnerSource.indexOf('"@nado/ui-native"')).toBeLessThan(
      expoRunnerSource.indexOf('"@nado/ui"'),
    );
    expect(
      expoRunnerSource.indexOf("buildMobileRuntimePackages()"),
    ).toBeLessThan(expoRunnerSource.indexOf("const child = spawn("));
    expect(expoRunnerSource).toContain(
      'spawnSync("pnpm", ["--filter", packageName, "build"]',
    );
    expect(expoRunnerSource).toContain("process.kill(process.pid, signal)");
  });

  it("declares the native primitive package for documented mobile imports", () => {
    expect(packageJson.dependencies["@nado/ui-native"]).toBe("workspace:*");
  });

  it("declares the UI facade package for documented @nado/ui/native imports", () => {
    expect(packageJson.dependencies["@nado/ui"]).toBe("workspace:*");
  });

  it("uses the Expo-compatible safe area provider", () => {
    expect(packageJson.dependencies["react-native-safe-area-context"]).toBe(
      "5.7.0",
    );
  });

  it("pins the Expo DOM peer required by the installed SDK", () => {
    expect(packageJson.dependencies["@expo/dom-webview"]).toBe("56.0.6");
  });

  it("selects the design demo only through the Metro build variant", () => {
    expect(indexSource).toContain("./src/entry/AppVariant");
    expect(metroConfigSource).toContain("NADO_MOBILE_APP_VARIANT");
    expect(metroConfigSource).toContain("App.design-demo.tsx");
    expect(packageJson.scripts["dev:design"]).toContain(
      "NADO_MOBILE_APP_VARIANT=design-demo",
    );
  });
});
