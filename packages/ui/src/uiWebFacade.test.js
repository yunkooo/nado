import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const uiPackageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const uiIndexSource = readFileSync(
  new URL("./index.ts", import.meta.url),
  "utf8",
);
const uiWebSource = readFileSync(new URL("./web.ts", import.meta.url), "utf8");
const uiWebPackageJsonUrl = new URL(
  "../../ui-web/package.json",
  import.meta.url,
);

describe("@nado/ui facade to @nado/ui-web", () => {
  it("depends on the Web/Desktop implementation package", () => {
    expect(uiPackageJson.dependencies["@nado/ui-web"]).toBe("workspace:*");
  });

  it("keeps @nado/ui and @nado/ui/web as facades over @nado/ui-web", () => {
    expect(uiIndexSource).toContain('export * from "@nado/ui-web"');
    expect(uiWebSource).toContain('export * from "@nado/ui-web"');
  });

  it("has a dedicated @nado/ui-web package manifest", () => {
    expect(existsSync(uiWebPackageJsonUrl)).toBe(true);

    const uiWebPackageJson = JSON.parse(
      readFileSync(uiWebPackageJsonUrl, "utf8"),
    );

    expect(uiWebPackageJson.name).toBe("@nado/ui-web");
    expect(uiWebPackageJson.exports["."].development).toBe("./src/index.ts");
    expect(uiWebPackageJson.exports["."].import).toBe("./dist/index.js");
    expect(uiWebPackageJson.exports["./styles.css"].development).toBe(
      "./src/styles.css",
    );
    expect(uiWebPackageJson.exports["./styles.css"].import).toBe(
      "./dist/styles.css",
    );
  });
});
