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

  it("lets vocabulary popovers escape the result card instead of clipping them", () => {
    const resultCardRule = readRule(".nado-result-card");
    const sectionRule = readRule(".nado-section");
    const wordPopoverRule = readRule(".nado-word-popover");

    expect(resultCardRule).toContain("overflow: visible");
    expect(resultCardRule).not.toContain("overflow: hidden");
    expect(sectionRule).toContain("position: relative");
    expect(wordPopoverRule).toContain("z-index: 30");
  });

  it("uses a strong active color for the composer send button", () => {
    const sendButtonRule = readRule(".nado-button--send");

    expect(sendButtonRule).toContain("background: var(--nado-color-primary)");
    expect(sendButtonRule).toContain("color: var(--nado-color-primary-ink)");
  });

  it("centers submitted input text while pinning the count to the lower right", () => {
    const inputSampleRule = readRule(".nado-input-sample");
    const inputTextRule = readRule(".nado-input-sample__text");
    const inputCountRule = readRule(".nado-input-sample__count");

    expect(inputSampleRule).toContain(
      "grid-template-rows: minmax(72px, 1fr) auto",
    );
    expect(inputSampleRule).toContain("min-height: 128px");
    expect(inputTextRule).toContain("align-self: center");
    expect(inputCountRule).toContain("justify-self: end");
    expect(inputCountRule).toContain("line-height: 1");
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
