import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const tsconfig = JSON.parse(
  readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
);
const startExpoScript = readFileSync(
  new URL("../../scripts/start-expo-with-root-env.mjs", import.meta.url),
  "utf8",
);
const runIosScript = readFileSync(
  new URL("../../scripts/run-ios-with-root-env.mjs", import.meta.url),
  "utf8",
);

describe("mobile project config", () => {
  it("typechecks every source file instead of only the entry import graph", () => {
    expect(tsconfig.include).toEqual([
      "App.tsx",
      "index.ts",
      "src/**/*.ts",
      "src/**/*.tsx",
    ]);
    expect(tsconfig.compilerOptions.types).toEqual(["node", "react"]);
  });

  it("formats TypeScript and TSX files under src", () => {
    expect(packageJson.scripts.lint).toContain('"src/**/*.{ts,tsx}"');
  });

  it("builds runtime workspace packages before Expo starts", () => {
    for (const scriptSource of [startExpoScript, runIosScript]) {
      expect(scriptSource).toContain(
        'const mobileRuntimePackages = ["@nado/shared", "@nado/tokens"]',
      );
      expect(scriptSource).toContain("buildMobileRuntimePackages()");
      expect(scriptSource).toContain(
        'spawnSync("pnpm", ["--filter", packageName, "build"]',
      );
    }
  });
});
