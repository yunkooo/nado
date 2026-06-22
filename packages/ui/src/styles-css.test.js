import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens } from "@nado/tokens";

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
    const activeWordPopoverRule = readRule(".nado-word-popover--open");

    expect(resultCardRule).toContain("overflow: visible");
    expect(resultCardRule).not.toContain("overflow: hidden");
    expect(sectionRule).toContain("position: relative");
    expect(wordPopoverRule).toContain("display: none");
    expect(wordPopoverRule).not.toContain("display: grid");
    expect(wordPopoverRule).toContain("position: fixed");
    expect(wordPopoverRule).toContain(
      "inline-size: var(--nado-word-popover-width",
    );
    expect(wordPopoverRule).toContain("left: var(--nado-word-popover-left");
    expect(wordPopoverRule).toContain("top: var(--nado-word-popover-top");
    expect(wordPopoverRule).toContain(
      "max-block-size: var(--nado-word-popover-height",
    );
    expect(wordPopoverRule).toContain("overflow-y: auto");
    expect(wordPopoverRule).toContain("z-index: 30");
    expect(styles).not.toContain(
      ".nado-word-token-wrap:hover .nado-word-popover",
    );
    expect(styles).not.toContain(
      ".nado-word-token-wrap:focus-within .nado-word-popover",
    );
    expect(activeWordPopoverRule).toContain("display: grid");
  });

  it("uses a strong active color for the composer send button", () => {
    const rootRule = readRule(":root");
    const sendButtonRule = readRule(".nado-button--send");

    expect(rootRule).toContain(
      "--nado-button-primary-background: var(--nado-color-primary)",
    );
    expect(rootRule).toContain(
      "--nado-button-send-background: var(--nado-button-primary-background)",
    );
    expect(sendButtonRule).toContain(
      "background: var(--nado-button-send-background)",
    );
    expect(sendButtonRule).toContain(
      "color: var(--nado-button-send-foreground)",
    );
  });

  it("keeps button styles aligned with component tokens", () => {
    const rootRule = readRule(":root");
    const buttonRule = readRule(".nado-button");
    const smButtonRule = readRule(".nado-button--sm");
    const mdButtonRule = readRule(".nado-button--md");
    const iconButtonRule = readRule(".nado-button--icon");
    const primaryButtonRule = readRule(".nado-button--primary");
    const secondaryButtonRule = readRule(".nado-button--secondary");
    const ghostButtonRule = readRule(".nado-button--ghost");
    const sendButtonRule = readRule(".nado-button--send");

    expect(rootRule).toContain(
      `--nado-button-size-md-height: ${tokens.component.button.size.md.height}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-icon-radius: ${tokens.component.button.size.icon.radius}`,
    );
    expect(rootRule).toContain(
      "--nado-button-send-background: var(--nado-button-primary-background)",
    );

    expect(buttonRule).toContain("border-radius: var(--nado-button-radius)");
    expect(buttonRule).toContain(
      "min-height: var(--nado-button-size-md-height)",
    );
    expect(smButtonRule).toContain(
      "min-height: var(--nado-button-size-sm-height)",
    );
    expect(mdButtonRule).toContain(
      "padding: 0 var(--nado-button-size-md-padding-x)",
    );
    expect(iconButtonRule).toContain(
      "border-radius: var(--nado-button-size-icon-radius)",
    );
    expect(iconButtonRule).toContain(
      "height: var(--nado-button-size-icon-height)",
    );
    expect(iconButtonRule).toContain(
      "width: var(--nado-button-size-icon-width)",
    );
    expect(primaryButtonRule).toContain(
      "background: var(--nado-button-primary-background)",
    );
    expect(primaryButtonRule).toContain(
      "color: var(--nado-button-primary-foreground)",
    );
    expect(secondaryButtonRule).toContain(
      "border-color: var(--nado-button-secondary-border)",
    );
    expect(ghostButtonRule).toContain(
      "background: var(--nado-button-ghost-background)",
    );
    expect(sendButtonRule).toContain(
      "background: var(--nado-button-send-background)",
    );
    expect(sendButtonRule).toContain(
      "color: var(--nado-button-send-foreground)",
    );
  });

  it("shows the composer model select affordance with a chevron", () => {
    const modelSelectRule = readRule(".nado-composer__model-select");

    expect(modelSelectRule).toContain("appearance: none");
    expect(modelSelectRule).toContain("background-image: url(");
    expect(modelSelectRule).toContain("background-position: right 10px center");
    expect(modelSelectRule).toContain("background-repeat: no-repeat");
    expect(modelSelectRule).toContain("padding: 0 34px 0 10px");
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
