import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isMobileDesignDemoFlagEnabled } from "./designTokenDemo";

const designTokenDemoSource = readFileSync(
  new URL("./designTokenDemo.ts", import.meta.url),
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
});
