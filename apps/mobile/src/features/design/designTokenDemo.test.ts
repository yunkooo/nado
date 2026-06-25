import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getMobileTokenParityDemoSections,
  isMobileDesignDemoFlagEnabled,
} from "./designTokenDemo";

const designTokenDemoSource = readFileSync(
  new URL("./designTokenDemo.ts", import.meta.url),
  "utf8",
);
const mobileTokenParityDemoScreenSource = readFileSync(
  new URL("./MobileTokenParityDemoScreen.tsx", import.meta.url),
  "utf8",
);

describe("mobile design token demo flag", () => {
  it("reads the Expo public flag with static dot notation for bundling", () => {
    expect(designTokenDemoSource).toContain(
      "process.env.EXPO_PUBLIC_NADO_MOBILE_DESIGN_DEMO",
    );
    expect(designTokenDemoSource).not.toContain("env[MOBILE_DESIGN_DEMO_FLAG]");
    expect(designTokenDemoSource).not.toContain(
      "process.env[MOBILE_DESIGN_DEMO_FLAG]",
    );
  });

  it("only enables the demo for the explicit Expo public flag value", () => {
    expect(isMobileDesignDemoFlagEnabled(undefined)).toBe(false);
    expect(isMobileDesignDemoFlagEnabled("true")).toBe(false);
    expect(isMobileDesignDemoFlagEnabled("1")).toBe(true);
  });

  it("documents the mobile token parity demo verification flow", () => {
    expect(getMobileTokenParityDemoSections()).toEqual([
      {
        description:
          "primary와 surfaceMuted 색상이 React Native 화면까지 같은 token source에서 이어지는지 확인합니다.",
        tokenSources: [
          "nativeTokens.color.primary",
          "nativeTokens.color.surfaceMuted",
        ],
        title: "Primary color",
      },
      {
        description:
          "primary, secondary, send, md, icon button contract가 component token을 통과하는지 확인합니다.",
        tokenSources: [
          "nativeTokens.component.button.primary",
          "nativeTokens.component.button.secondary",
          "nativeTokens.component.button.send",
          "nativeTokens.component.button.size.md",
          "nativeTokens.component.button.size.icon",
        ],
        title: "Button contract",
      },
    ]);
  });

  it("renders the demo screen from the shared verification flow", () => {
    expect(mobileTokenParityDemoScreenSource).toContain(
      "getMobileTokenParityDemoSections",
    );
    expect(mobileTokenParityDemoScreenSource).toContain(
      "tokenSources.map((tokenSource)",
    );
  });

  it("applies the native primitive package on the low-risk demo surface", () => {
    expect(mobileTokenParityDemoScreenSource).toContain(
      'import { Button, Stack, Text } from "@nado/ui-native";',
    );
    expect(mobileTokenParityDemoScreenSource).toContain("<Stack");
    expect(mobileTokenParityDemoScreenSource).toContain(
      '<Button variant="primary"',
    );
    expect(mobileTokenParityDemoScreenSource).toContain(
      'accessibilityLabel="Send icon token sample"',
    );
    expect(mobileTokenParityDemoScreenSource).toContain('size="icon"');
    expect(mobileTokenParityDemoScreenSource).toContain('variant="send"');
  });
});
