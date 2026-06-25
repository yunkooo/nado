import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("@nado/ui package exports", () => {
  it("points development imports at source while keeping production imports on dist", () => {
    expect(packageJson.exports["."].development).toBe("./src/index.ts");
    expect(packageJson.exports["."].import).toBe("./dist/index.js");
  });

  it("copies stylesheet imports through the same development and production boundary", () => {
    expect(packageJson.exports["./styles.css"].development).toBe(
      "./src/styles.css",
    );
    expect(packageJson.exports["./styles.css"].import).toBe(
      "./dist/styles.css",
    );
    expect(packageJson.exports["./web/styles.css"].development).toBe(
      "./src/styles.css",
    );
    expect(packageJson.exports["./web/styles.css"].import).toBe(
      "./dist/styles.css",
    );
  });

  it("exposes the Web/Desktop public surface through @nado/ui/web", () => {
    expect(packageJson.exports["./web"].types).toBe("./src/web.ts");
    expect(packageJson.exports["./web"].development).toBe("./src/web.ts");
    expect(packageJson.exports["./web"].import).toBe("./dist/web.js");
  });
});
