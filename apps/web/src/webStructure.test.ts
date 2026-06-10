import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRootFiles = readdirSync(new URL("./app", import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort();

describe("web source structure", () => {
  it("keeps Next route files in app and feature code outside app", () => {
    expect(appRootFiles).toEqual(["globals.css", "layout.tsx", "page.tsx"]);
  });

  it("groups reusable web code by responsibility", () => {
    expect(readdirSync(new URL("./features", import.meta.url)).sort()).toEqual([
      "analysis",
      "auth",
      "review",
      "vocabulary",
    ]);
    expect(
      readdirSync(new URL("./components", import.meta.url)).sort(),
    ).toEqual(["AppShell.tsx", "AuthControls.tsx"]);
    expect(readdirSync(new URL("./lib", import.meta.url)).sort()).toEqual([
      "apiClient.ts",
    ]);
  });
});
