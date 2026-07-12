import { describe, expect, it } from "vitest";
import {
  getMobileTokenParityDemoSections,
  MOBILE_DESIGN_DEMO_BUNDLE_MARKER,
} from "./designTokenDemo";

describe("mobile design token demo contract", () => {
  it("exposes a stable marker for the real bundle graph verification", () => {
    expect(MOBILE_DESIGN_DEMO_BUNDLE_MARKER).toBe(
      "NADO_MOBILE_DESIGN_DEMO_BUNDLE_MARKER",
    );
  });

  it("documents the mobile token parity demo verification flow", () => {
    expect(getMobileTokenParityDemoSections()).toEqual([
      {
        description:
          "primary와 surfaceMuted 색상이 React Native 화면까지 같은 token source에서 이어지는지 확인합니다.",
        kind: "color",
        tokenSources: [
          "nativeTokens.color.primary",
          "nativeTokens.color.surfaceMuted",
        ],
        title: "Primary color",
      },
      {
        description:
          "primary, secondary, send, md, icon button contract가 component token을 통과하는지 확인합니다.",
        kind: "button",
        tokenSources: [
          "nativeTokens.component.button.primary",
          "nativeTokens.component.button.secondary",
          "nativeTokens.component.button.send",
          "nativeTokens.component.button.size.md",
          "nativeTokens.component.button.size.icon",
        ],
        title: "Button contract",
      },
      {
        description:
          "Card, Badge, Chip primitive가 semantic token과 component token을 같은 RN facade에서 확인할 수 있는지 봅니다.",
        kind: "primitive",
        tokenSources: [
          "nativeTokens.color.surface",
          "nativeTokens.color.surfaceMuted",
          "nativeTokens.radius.pill",
          "nativeTokens.component.chip.background",
          "nativeTokens.component.chip.foreground",
          "nativeTokens.component.chip.prefix",
        ],
        title: "Card, Badge, Chip contract",
      },
    ]);
  });
});
