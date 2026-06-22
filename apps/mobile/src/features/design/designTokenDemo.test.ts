import { describe, expect, it } from "vitest";
import {
  MOBILE_DESIGN_DEMO_FLAG,
  readMobileDesignDemoEnabled,
} from "./designTokenDemo";

describe("mobile design token demo flag", () => {
  it("only enables the demo for the explicit Expo public flag value", () => {
    expect(readMobileDesignDemoEnabled({})).toBe(false);
    expect(
      readMobileDesignDemoEnabled({ [MOBILE_DESIGN_DEMO_FLAG]: "true" }),
    ).toBe(false);
    expect(
      readMobileDesignDemoEnabled({ [MOBILE_DESIGN_DEMO_FLAG]: "1" }),
    ).toBe(true);
  });
});
