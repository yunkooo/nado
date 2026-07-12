import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  StyleSheet: {
    create: <T>(styleSheet: T) => styleSheet,
  },
}));

import { nativeTokens } from "@nado/tokens/react-native";
import { analysisStyles } from "./analysisStyles";
import { appStyles } from "./appStyles";
import { designStyles } from "./designStyles";
import {
  mobileButtonTokens,
  mobileColors,
  mobileRadius,
  mobileReviewCardTokens,
  mobileSpacing,
  mobileTypography,
  styles,
} from "./mobileStyles";
import { studyStyles } from "./studyStyles";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);

describe("mobile shared styles", () => {
  it("uses shared native tokens and keeps every style in one surface group", () => {
    expect(packageJson.dependencies["@nado/tokens"]).toBe("workspace:*");
    expect(mobileColors).toBe(nativeTokens.color);
    expect(mobileRadius).toBe(nativeTokens.radius);
    expect(mobileSpacing).toBe(nativeTokens.spacing);
    expect(mobileTypography).toBe(nativeTokens.typography.text);
    expect(mobileButtonTokens).toBe(nativeTokens.component.button);
    expect(mobileReviewCardTokens).toBe(nativeTokens.component.reviewCard);

    const groupedStyleKeys = [
      ...Object.keys(appStyles),
      ...Object.keys(analysisStyles),
      ...Object.keys(studyStyles),
      ...Object.keys(designStyles),
    ];

    expect(new Set(groupedStyleKeys).size).toBe(groupedStyleKeys.length);
    expect(Object.keys(styles).sort()).toEqual(groupedStyleKeys.sort());
  });

  it("keeps the analysis composer inside bottom-aligned scroll content", () => {
    expect(styles.content).toMatchObject({ flexGrow: 1 });
    expect(styles.composerWrap).toMatchObject({ marginTop: "auto" });
  });

  it("backs analysis actions with shared button tokens", () => {
    expect(styles.analyzeButton).toMatchObject({
      backgroundColor: mobileButtonTokens.send.background,
      borderRadius: mobileButtonTokens.size.icon.radius,
      height: mobileButtonTokens.size.icon.height,
      minHeight: mobileButtonTokens.size.icon.height,
      minWidth: mobileButtonTokens.size.icon.width,
      width: mobileButtonTokens.size.icon.width,
    });
    expect(styles.analyzeButtonText).toMatchObject({
      color: mobileButtonTokens.send.foreground,
    });
    expect(styles.primaryButton).toMatchObject({
      backgroundColor: mobileButtonTokens.primary.background,
      borderRadius: mobileButtonTokens.radius,
      minHeight: mobileButtonTokens.size.md.height,
      paddingHorizontal: mobileButtonTokens.size.md.paddingX,
    });
  });

  it("backs the design demo surface with shared tokens", () => {
    expect(styles.designDemoSurface).toMatchObject({
      backgroundColor: mobileColors.surface,
      borderRadius: mobileRadius.md,
      gap: mobileSpacing.md,
    });
    expect(styles.designDemoPrimarySwatch).toMatchObject({
      backgroundColor: mobileColors.primary,
      borderRadius: mobileRadius.md,
    });
    expect(styles.designDemoTokenSource).toMatchObject({
      backgroundColor: mobileColors.surfaceMuted,
      borderRadius: mobileRadius.sm,
      maxWidth: "100%",
    });
  });

  it("keeps ui-native card styles limited to inner layout", () => {
    expect(styles.meaningCard).toEqual({ gap: mobileSpacing.xs });
    expect(styles.vocabularyItem).toEqual({ gap: 14, minHeight: 220 });
    expect(styles.reviewCard).toEqual({
      alignItems: "center",
      gap: 10,
      justifyContent: "center",
      minHeight: 220,
    });
    expect(styles.wordDefinitionCard).toEqual({
      alignSelf: "stretch",
      gap: 10,
    });
  });

  it("positions word definitions as anchored overlays", () => {
    expect(styles.wordDefinitionPopoverCard).toMatchObject({
      position: "absolute",
      zIndex: 40,
    });
    expect(styles.sentenceCardActive).toEqual({ zIndex: 20 });
    expect(styles.chunkUnitActive).toEqual({ zIndex: 30 });
  });

  it("keeps reading chunks and suggestion states responsive", () => {
    expect(styles.chunkLine).toMatchObject({
      flexDirection: "row",
      flexWrap: "wrap",
    });
    expect(styles.chunkUnit).toMatchObject({ flexShrink: 1 });
    expect(styles.suggestionChipSaved).toMatchObject({ opacity: 1 });
    expect(styles.suggestionChipSaving).toEqual({ opacity: 0.64 });
    expect(styles).not.toHaveProperty("suggestionChip");
    expect(styles.chunkSlash).toMatchObject({
      color: mobileColors.accent,
      lineHeight: 31,
    });
  });

  it("uses shared typography values for matching product styles", () => {
    expect(styles.inputDisclosure).toMatchObject({
      fontSize: mobileTypography.size.xs,
    });
    expect(styles.reviewAnswer).toMatchObject({
      fontSize: mobileTypography.size.sm,
    });
    expect(styles.emptyPanelTitle).toMatchObject({
      fontSize: mobileTypography.size.md,
    });
    expect(styles.statusTitle).toMatchObject({
      fontSize: mobileTypography.size.lg,
    });
  });

  it("shows the model selector affordance", () => {
    expect(styles.modelSelectButton).toMatchObject({
      flexDirection: "row",
      gap: 8,
    });
    expect(styles.modelSelectChevron).toMatchObject({
      borderRightColor: mobileColors.inkMuted,
      transform: [{ rotate: "45deg" }],
    });
  });

  it("matches shared review-answer tokens in hidden and revealed states", () => {
    expect(styles.reviewAnswer).toMatchObject({
      backgroundColor: mobileReviewCardTokens.answer.background,
      borderColor: mobileReviewCardTokens.answer.border,
      borderRadius: mobileReviewCardTokens.answer.radius,
      color: mobileReviewCardTokens.answer.foreground,
      filter: "blur(5px)",
      padding: mobileReviewCardTokens.answer.padding,
      userSelect: "none",
    });
    expect(styles.reviewAnswerRevealed).toEqual({
      filter: "none",
      userSelect: "auto",
    });
  });
});
