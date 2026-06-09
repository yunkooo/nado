import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("analysis component styles", () => {
  it("uses result-card container queries for embedded narrow layouts", () => {
    expect(styles).toContain("container: nado-result-card / inline-size");
    expect(styles).toContain("@container nado-result-card");
  });

  it("wraps long reading chunks before they overflow the sentence card", () => {
    const readingTextRule = readRule(
      ".nado-reading-line__english,\n.nado-reading-line__korean",
    );

    expect(styles).toContain(
      ".nado-reading-line__english,\n.nado-reading-line__korean",
    );
    expect(readingTextRule).toContain("overflow-wrap: anywhere");
    expect(readingTextRule).toContain("white-space: normal");
    expect(readRule(".nado-reading-line__english")).not.toContain(
      "white-space: nowrap",
    );
    expect(readRule(".nado-reading-line__korean")).not.toContain(
      "white-space: nowrap",
    );
  });

  it("uses a strong active color for the composer send button", () => {
    const sendButtonRule = readRule(".nado-button--send");

    expect(sendButtonRule).toContain("background: var(--nado-color-primary)");
    expect(sendButtonRule).toContain("color: var(--nado-color-primary-ink)");
  });
});

function readRule(selector) {
  const startIndex = styles.indexOf(`${selector} {`);

  if (startIndex === -1) {
    return "";
  }

  const endIndex = styles.indexOf("}", startIndex);

  return styles.slice(startIndex, endIndex);
}
