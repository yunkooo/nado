import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("@nado/shared package exports", () => {
  it("points development imports at source while keeping production imports on dist", () => {
    expect(packageJson.exports["."].development).toBe("./src/index.ts");
    expect(packageJson.exports["."].import).toBe("./dist/index.js");
  });
});
