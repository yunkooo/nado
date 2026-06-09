import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("@nado/ui package exports", () => {
  it("points local app imports at source instead of ignored dist output", () => {
    expect(packageJson.exports["."].import).toBe("./src/index.ts");
  });
});
