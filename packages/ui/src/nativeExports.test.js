import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nativeFacadeSource = readFileSync(
  new URL("./native.ts", import.meta.url),
  "utf8",
);

describe("@nado/ui/native exports", () => {
  it("re-exports the React Native implementation package without touching the root facade", () => {
    expect(nativeFacadeSource).toBe('export * from "@nado/ui-native";\n');
  });
});
