import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const React = await import("react");

  type HostProps = {
    accessibilityLabel?: string;
    children?: ReactNode;
    disabled?: boolean;
  };

  function View({ accessibilityLabel, children }: HostProps) {
    return React.createElement(
      "div",
      accessibilityLabel ? { "aria-label": accessibilityLabel } : undefined,
      children,
    );
  }

  function Text({ accessibilityLabel, children }: HostProps) {
    return React.createElement(
      "span",
      accessibilityLabel ? { "aria-label": accessibilityLabel } : undefined,
      children,
    );
  }

  function Pressable({ accessibilityLabel, children, disabled }: HostProps) {
    return React.createElement(
      "button",
      {
        "aria-label": accessibilityLabel,
        disabled,
      },
      children,
    );
  }

  return {
    Pressable,
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text,
    View,
  };
});

import { MobileTokenParityDemoScreen } from "./MobileTokenParityDemoScreen";

describe("MobileTokenParityDemoScreen", () => {
  it("renders the native facade primitives and token references together", () => {
    const markup = renderToStaticMarkup(<MobileTokenParityDemoScreen />);

    expect(markup).toContain('aria-label="모바일 토큰 데모"');
    expect(markup).toContain("모바일 디자인 데모");
    expect(markup).toContain("Primary");
    expect(markup).toContain("Secondary");
    expect(markup).toContain('aria-label="Send icon token sample"');
    expect(markup).toContain("Card Badge Chip token sample");
    expect(markup).toContain("setup · 준비");
    expect(markup).toContain("nativeTokens.color.primary");
    expect(markup).toContain("nativeTokens.component.chip.background");
  });
});
