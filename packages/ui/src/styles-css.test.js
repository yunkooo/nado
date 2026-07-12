import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("@nado/ui stylesheet facade", () => {
  it("delegates Web and Desktop styles to the implementation package", () => {
    expect(styles.trim()).toBe('@import "@nado/ui-web/styles.css";');
  });
});
