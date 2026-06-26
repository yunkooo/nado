import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens } from "@nado/tokens";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const cssPrimitiveTokenEntries = [
  ["--nado-color-primary", tokens.color.primary],
  ["--nado-color-primary-ink", tokens.color.primaryInk],
  ["--nado-color-surface-muted", tokens.color.surfaceMuted],
  ["--nado-color-border", tokens.color.border],
  ["--nado-color-ink", tokens.color.ink],
  ["--nado-color-ink-muted", tokens.color.inkMuted],
  ["--nado-radius-md", tokens.radius.md],
  ["--nado-radius-pill", tokens.radius.pill],
];
const cssPrimitiveReferences = new Map(
  cssPrimitiveTokenEntries.map(([variableName, value]) => [
    value,
    `var(${variableName})`,
  ]),
);
const cssTokenValue = (value) =>
  value === "transparent"
    ? "transparent"
    : (cssPrimitiveReferences.get(value) ?? value);

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
    const sendButtonRule = readRule(".nado-button--send");

    expect(sendButtonRule).not.toContain("--nado-button-send-background:");
    expect(sendButtonRule).not.toContain("--nado-button-send-foreground:");
    expect(sendButtonRule).not.toContain("--nado-button-primary-background");
    expect(sendButtonRule).not.toContain("--nado-button-primary-foreground");
    expect(sendButtonRule).toContain(
      `background: var(--nado-button-send-background, ${cssTokenValue(tokens.component.button.send.background)})`,
    );
    expect(sendButtonRule).toContain(
      `color: var(--nado-button-send-foreground, ${cssTokenValue(tokens.component.button.send.foreground)})`,
    );
  });

  it("keeps button styles aligned with component tokens", () => {
    const buttonTokens = tokens.component.button;
    const rootRule = readRule(":root");
    const buttonRule = readRule(".nado-button");
    const smButtonRule = readRule(".nado-button--sm");
    const mdButtonRule = readRule(".nado-button--md");
    const iconButtonRule = readRule(".nado-button--icon");
    const primaryButtonRule = readRule(".nado-button--primary");
    const secondaryButtonRule = readRule(".nado-button--secondary");
    const ghostButtonRule = readRule(".nado-button--ghost");
    const sendButtonRule = readRule(".nado-button--send");

    for (const [variableName, tokenValue] of cssPrimitiveTokenEntries) {
      expect(rootRule).toContain(`${variableName}: ${tokenValue}`);
    }

    expect(buttonRule).not.toContain("--nado-button-radius:");
    expect(primaryButtonRule).not.toContain(
      "--nado-button-primary-background:",
    );
    expect(primaryButtonRule).not.toContain(
      "--nado-button-primary-foreground:",
    );
    expect(secondaryButtonRule).not.toContain(
      "--nado-button-secondary-background:",
    );
    expect(secondaryButtonRule).not.toContain(
      "--nado-button-secondary-border:",
    );
    expect(secondaryButtonRule).not.toContain(
      "--nado-button-secondary-foreground:",
    );
    expect(ghostButtonRule).not.toContain("--nado-button-ghost-background:");
    expect(ghostButtonRule).not.toContain("--nado-button-ghost-foreground:");
    expect(sendButtonRule).not.toContain("--nado-button-send-background:");
    expect(sendButtonRule).not.toContain("--nado-button-send-foreground:");
    expect(rootRule).toContain(
      `--nado-button-size-sm-height: ${buttonTokens.size.sm.height}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-sm-padding-x: ${buttonTokens.size.sm.paddingX}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-md-height: ${buttonTokens.size.md.height}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-md-padding-x: ${buttonTokens.size.md.paddingX}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-icon-height: ${buttonTokens.size.icon.height}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-icon-padding-x: ${buttonTokens.size.icon.paddingX}`,
    );
    expect(rootRule).toContain(
      `--nado-button-size-icon-width: ${buttonTokens.size.icon.width}`,
    );
    expect(iconButtonRule).not.toContain("--nado-button-size-icon-radius:");

    expect(buttonRule).toContain(
      `border-radius: var(--nado-button-radius, ${cssTokenValue(buttonTokens.radius)})`,
    );
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
      `border-radius: var(--nado-button-size-icon-radius, ${cssTokenValue(buttonTokens.size.icon.radius)})`,
    );
    expect(iconButtonRule).toContain(
      "height: var(--nado-button-size-icon-height)",
    );
    expect(iconButtonRule).toContain(
      "width: var(--nado-button-size-icon-width)",
    );
    expect(primaryButtonRule).toContain(
      `background: var(--nado-button-primary-background, ${cssTokenValue(buttonTokens.primary.background)})`,
    );
    expect(primaryButtonRule).toContain(
      `color: var(--nado-button-primary-foreground, ${cssTokenValue(buttonTokens.primary.foreground)})`,
    );
    expect(secondaryButtonRule).toMatch(
      /background:\s*var\(\s*--nado-button-secondary-background,\s*var\(--nado-color-surface-muted\)\s*\)/,
    );
    expect(secondaryButtonRule).toContain(
      `border-color: var(--nado-button-secondary-border, ${cssTokenValue(buttonTokens.secondary.border)})`,
    );
    expect(secondaryButtonRule).toContain(
      `color: var(--nado-button-secondary-foreground, ${cssTokenValue(buttonTokens.secondary.foreground)})`,
    );
    expect(ghostButtonRule).toContain(
      `background: var(--nado-button-ghost-background, ${cssTokenValue(buttonTokens.ghost.background)})`,
    );
    expect(ghostButtonRule).toContain(
      `color: var(--nado-button-ghost-foreground, ${cssTokenValue(buttonTokens.ghost.foreground)})`,
    );
    expect(sendButtonRule).toContain(
      `background: var(--nado-button-send-background, ${cssTokenValue(buttonTokens.send.background)})`,
    );
    expect(sendButtonRule).toContain(
      `color: var(--nado-button-send-foreground, ${cssTokenValue(buttonTokens.send.foreground)})`,
    );
  });

  it("keeps review card answer styles aligned with component tokens", () => {
    const answerTokens = tokens.component.reviewCard.answer;
    const revealedReviewCardRule = readRule(".nado-review-card--revealed");
    const answerRule = readRule(".nado-review-card__answer");

    expect(revealedReviewCardRule).toContain(
      `border-color: var(--nado-review-card-answer-border, ${cssTokenValue(answerTokens.border)})`,
    );
    expect(answerRule).toContain(
      `background: var(--nado-review-card-answer-background, ${cssTokenValue(answerTokens.background)})`,
    );
    expect(answerRule).toContain(
      `border: 1px solid var(--nado-review-card-answer-border, ${cssTokenValue(answerTokens.border)})`,
    );
    expect(answerRule).toContain(
      `border-radius: var(--nado-review-card-answer-radius, ${cssTokenValue(answerTokens.radius)})`,
    );
    expect(answerRule).toContain(
      `padding: var(--nado-review-card-answer-padding, ${cssTokenValue(answerTokens.padding)})`,
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
