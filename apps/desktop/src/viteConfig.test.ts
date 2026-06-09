import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const viteConfigSource = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);

describe("desktop Vite config", () => {
  it("loads environment variables from the repository root", () => {
    expect(viteConfigSource).toContain('envDir: "../.."');
  });
});
