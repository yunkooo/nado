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
const uiNativeSourceUrl = new URL("./native.ts", import.meta.url);
const uiWebPackageJsonUrl = new URL(
  "../../ui-web/package.json",
  import.meta.url,
);

describe("@nado/ui facade to @nado/ui-web", () => {
  it("depends on the Web/Desktop implementation package", () => {
    expect(uiPackageJson.dependencies["@nado/ui-web"]).toBe("workspace:*");
  });

  it("uses the React Native implementation package without making Web/Desktop depend on it", () => {
    expect(uiPackageJson.dependencies["@nado/ui-native"]).toBeUndefined();
    expect(uiPackageJson.devDependencies["@nado/ui-native"]).toBe(
      "workspace:*",
    );
    expect(uiPackageJson.peerDependencies["@nado/ui-native"]).toBeUndefined();
    expect(uiPackageJson.peerDependencies["react-native"]).toBeUndefined();
  });

  it("keeps platform-specific peers compatible with Web/Desktop and Mobile apps", () => {
    expect(uiPackageJson.peerDependencies.react).toBe("^19.2.3 || ^19.2.7");
    expect(uiPackageJson.peerDependencies["react-dom"]).toBe(
      "^19.2.3 || ^19.2.7",
    );
  });

  it("keeps implementation package peers aligned with the facade consumers", () => {
    const uiWebPackageJson = JSON.parse(
      readFileSync(uiWebPackageJsonUrl, "utf8"),
    );
    const uiNativePackageJson = JSON.parse(
      readFileSync(new URL("../../ui-native/package.json", import.meta.url)),
    );

    expect(uiWebPackageJson.peerDependencies.react).toBe("^19.2.3 || ^19.2.7");
    expect(uiWebPackageJson.peerDependencies["react-dom"]).toBe(
      "^19.2.3 || ^19.2.7",
    );
    expect(uiNativePackageJson.peerDependencies.react).toBe(
      "^19.2.3 || ^19.2.7",
    );
    expect(uiNativePackageJson.peerDependencies["react-native"]).toBe(
      "^0.85.3",
    );
  });

  it("keeps @nado/ui and @nado/ui/web as facades over @nado/ui-web", () => {
    expect(uiIndexSource).toContain('export * from "@nado/ui-web"');
    expect(uiWebSource).toContain('export * from "@nado/ui-web"');
  });

  it("keeps @nado/ui/native as a facade over @nado/ui-native", () => {
    expect(existsSync(uiNativeSourceUrl)).toBe(true);

    const uiNativeSource = existsSync(uiNativeSourceUrl)
      ? readFileSync(uiNativeSourceUrl, "utf8")
      : "";

    expect(uiNativeSource).toContain('export * from "@nado/ui-native"');
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
