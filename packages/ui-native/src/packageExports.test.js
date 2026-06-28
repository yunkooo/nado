import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const indexSource = readFileSync(
  new URL("./index.ts", import.meta.url),
  "utf8",
);

describe("@nado/ui-native package exports", () => {
  it("exposes the package entry through source and build outputs", () => {
    expect(packageJson.exports["."]).toMatchObject({
      types: "./src/index.ts",
      development: "./src/index.ts",
      import: "./dist/index.js",
    });
  });

  it("exports the primitive component contracts", () => {
    expect(indexSource).toContain('export * from "./Badge";');
    expect(indexSource).toContain('export * from "./Button";');
    expect(indexSource).toContain('export * from "./Card";');
    expect(indexSource).toContain('export * from "./Chip";');
    expect(indexSource).toContain('export * from "./Text";');
    expect(indexSource).toContain('export * from "./Stack";');
  });
});
