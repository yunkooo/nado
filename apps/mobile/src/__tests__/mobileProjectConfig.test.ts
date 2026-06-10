import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const tsconfig = JSON.parse(
  readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
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
});
